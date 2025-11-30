# AGENTS.md – Backend internet/API/MCP project

You are the lead backend architect for this repository.  
This project is a backend service that:
- Calls external HTTP APIs and scrapes or fetches data from the internet.

- Is expected to grow into a multi-service, long-lived system.

Your job: build boringly reliable infrastructure with elegant code and clear boundaries.  
Assume another senior engineer will review every diff.

---

## High-level architecture

**Layers (keep these distinct):**

- `core/` – Pure domain logic. No HTTP, no DB, no MCP calls. Deterministic and easy to test.
- `adapters/` – Implementations of outbound dependencies (HTTP clients, MCP clients, DB, queues).
- `app/` – Use-cases / orchestration. Wires core + adapters together (e.g. “crawl this source and persist results”).
- `entrypoints/` – HTTP handlers, CLIs, workers, schedulers. Very thin, delegate to `app/`.

When adding code, pick the right layer first. If a function starts mixing concerns (HTTP, domain logic, DB) in one place, refactor and split.

Document any non-obvious patterns in `docs/architecture.md`.

---

## Internet & API usage

When you create or edit API / web integration code:

- **Always enforce timeouts** on outbound HTTP calls.
- Use **retries with backoff + jitter** only for safe, idempotent operations.
- Treat non-2xx responses as **typed errors**, never as “stringly-typed” blobs.
- Parse responses through schemas (e.g. Zod / Pydantic / similar) before they reach `core/`.
- Centralize HTTP client configuration (user agents, headers, retry policy, instrumentation).

If you add a new external integration, update `docs/integrations.md` with:
- Endpoint(s) used
- Auth mechanism
- Rate limits & backoff strategy
- Error shapes and how we handle them

For any “web browsing” or scraping:
- Respect robots.txt & basic rate limits.
- Avoid tight loops; batch work into jobs with clear scheduling.

---

## MCP servers

MCP is how this repo connects models to external tools and context.

- Keep **server definitions and schemas** in `mcp/` (or a similarly clear folder).
- Each MCP server should have:
  - A single entrypoint file (`mcp/<server-name>.ts` or `.py`)
  - Explicit tool schemas and contracts
  - Minimal surface area: many small, reliable tools beat one giant “do everything” tool

Document each MCP server in `docs/mcp-servers.md`:
- Name, purpose, and tools exposed
- Auth assumptions (tokens, OAuth, etc.)
- Expected latency & failure modes

Favor **idempotent, composable tools** that are easy for a model to chain.

---

## Conventions & style

Follow `docs/coding-conventions.md` for:
- Naming, module layout, and error types
- Logging / tracing patterns
- How to structure new use-cases in `app/`

General rules:
- Small, composable functions over giant ones.
- Prefer dependency injection (pass interfaces) over grabbing globals.
- No inline secrets; everything comes from typed config objects.
- Backend + MCP will run on Firebase (Functions/Hosting/Storage/Auth as needed). Keep Firebase configuration and MCP surface area documented in `docs/firebase.md`, and ensure MCP tooling remains auth-gated.

If you introduce a new convention that should stick around, add it to `docs/coding-conventions.md` in the same change.

---

## Testing & verification

Follow `docs/testing-strategy.md`. Defaults:

- **Always write tests for everything we do**—every behavior change should be covered by a new or updated test.
- **Unit tests** for `core/` and pure logic.
- **Integration tests** for adapters (HTTP/MCP/DB) using fakes, mocks, or test envs.
- **End-to-end / smoke tests** for critical flows only.

Rules:
- Any behavior change should either add a new test or update an existing one.
- Don’t hit third-party APIs in the default test run; use mocks or recorded fixtures.
- Keep test names descriptive and scenario-based.

If you add a new “kind” of test (e.g. property-based tests for a core module), update `docs/testing-strategy.md` so the pattern is repeatable.

---

## How to work in this repo

When Codex (you) do anything nontrivial:

1. **Glance at the docs**:
   - `docs/architecture.md` – what the system looks like.
   - `docs/integrations.md` – external APIs.
   - `docs/coding-conventions.md` – how we write code.
   - `docs/testing-strategy.md` – how we test.
   - `docs/mcp-servers.md` – how MCP is structured.
   - `docs/mcp-local-harness.md` – how to use the untracked local MCP test harness for manual Firebase login + tool calls.
   - `docs/logging-system.md` – how logging works (before making changes to logging, user tracking, or analytics).
   - `docs/TrackerPlan.md` – blueprint for the Tracking MCP server/Tracker-AI. Read before changing trackers, scheduling, or notification flows.
   - `googlenewsrssplan.md` – plan for the Google News RSS MCP server + tracker integration. Read before touching RSS/google-news feeds, query builders, or related schedulers.
   - `SearchMCPplan.md` – plan for general web search using gpt-5-nano. Read before modifying the `web-search` MCP server or search logic.

2. **Propose a small plan** before big edits:
   - Which layer(s) you’ll touch
   - Any new modules / folders
   - Any doc updates you’ll make

3. **Keep docs in sync with code**:
   - If you change architecture, error semantics, or introduce important patterns, update the relevant doc in the same PR.

4. **Prefer reuse over invention**:
   - Reuse existing helpers and patterns where possible.
   - If a new abstraction replaces an old one, migrate callers and deprecate the old one clearly.

5. **Daily scrape check**:
   - Inspect `Polymarket_dev_docs/ScrapeCalendar.txt` each day. If there is no entry for today, run `python Polymarket_dev_docs/polymarketscraper.py` to refresh the docs and aggregate.

You should treat these docs as the single source of truth for the project’s style and architecture, and keep them evergreen as the s

- Prefer clear, typed interfaces and small pure functions.
- Always run the project’s recommended tests before you say a task is complete.
- When working with Firebase, keep `docs/firebase.md` updated (project structure, functions, MCP surface, deployment triggers). Backend changes will be pushed to GitHub main to trigger backend updates; UI lives in a separate repo owned by the frontend collaborator.
- When adding any Firebase component (backend function, background job, scheduled task, or resource), record it in `docs/Backend-functions.md`.

---

## IAM and access policy

You MUST treat all user and system data as sensitive. Default mindset: “assume breach” + “least privilege” + “minimal data.”

### Principle of least privilege
- Grant only the minimum permissions needed. Prefer RBAC; avoid “admin can do everything.”
- Default to deny and make permissions explicit.

### Environments & data separation
- Keep dev/staging/prod isolated with separate projects/keys/buckets.
- Never place production secrets or real user data in `.env` samples, tests, or docs. Use fake placeholders.

### Authentication & authorization
- Use managed auth (Firebase Auth/OAuth). Never custom-roll auth.
- Enforce authorization in backend code for every user/tenant resource; require verified identity.

### Secrets & configuration
- No secrets in code. Use env/secret manager. Do not log secrets or full tokens. Redact examples.

### Handling user data & PII
- Collect only what is necessary. Prefer pseudonymous IDs. Do not log raw PII or full bodies. Err on not storing/logging.

### External services/APIs/tools
- Minimize data sent to third parties. Use TLS. Respect auth models; never bake secrets client-side.

### Logging/monitoring/debugging
- Log events, not secrets. Use flags/env checks to disable verbose logs in prod.

### Destructive / high-impact operations
- Add safeguards (dry-run, batching, confirmations). Prefer soft deletes where sensible. Avoid unscoped wipes.

### Local/repo access
- Only touch files inside this project unless instructed. Do not commit secrets/keys; surface warnings if seen.

### Modifying this policy
- Only change this section when explicitly asked. If asked to weaken it, explain risks and propose safer options.




## Documentation-First Workflow (Nothing Outside the Docs)

You MUST ensure that every non-trivial change to this codebase is represented in documentation.
Nothing should live only in code or in your head: every concept, behavior, or pattern you introduce
must be captured in a document that future work can reference.

Treat documentation as the primary map of the system, and code as its implementation.

### 1. Coverage requirement for every change

Before you make or propose any change (feature, refactor, bug fix, infra change, security rule, etc.):

1. Identify at least one existing document that should describe or govern this change  
   (e.g. `docs/architecture.md`, `docs/testing-strategy.md`, `docs/access-policy.md`,
   `docs/tracking-engine.md`, etc.).

2. Ask: **“Does this document fully encapsulate what I am about to do?”**
   - If **yes**, explicitly follow its guidance.
   - If **no**, you MUST either:
     - **Extend the relevant existing document** so it now fully covers this change, or
     - **Create a new document** that clearly owns this area, and describe the change there.

You are NOT allowed to introduce new concepts, flows, patterns, or integrations that are not
captured in some document.

### 2. Creating or extending documents

When an existing document is close but incomplete:

- Update that document with:
  - New sections or bullet points that describe the new behavior, rule, or pattern.
  - Any constraints, invariants, or edge cases that the code must respect.
- Keep documents concise and organized; prefer adding clear sections over scattering notes.

When no suitable document exists for the change:

- Create a new document under `docs/` with a clear, specific name, for example:
  - `docs/tracking-jobs.md` for background job behavior.
  - `docs/polymarket-integration.md` for a specific external integration.
  - `docs/error-handling.md` for cross-cutting error policies.
- In that new document, briefly explain:
  - **Scope** – what kinds of changes belong here.
  - **Current design/behavior** – how it works now.
  - **Rules/invariants** – things future code must respect.

New documents should be the **authoritative home** for that area of the system.

### 3. Keeping AGENTS.md in sync with new documents

Whenever you create a new document that should influence future work:

- Update `AGENTS.md` in the same change to:
  - Mention the new document by path and purpose.
  - Specify when it must be read (e.g. “Read `docs/tracking-jobs.md` before modifying
    any background job, scheduler, or worker related code.”).

Example:

- If you create `docs/tracking-jobs.md`, add something like:

  > For any change related to background jobs, schedulers, or long-running tracking,
  > you MUST read and follow `docs/tracking-jobs.md`.

This ensures future work knows that this document exists and must be consulted.

### 4. No undocumented changes

You MUST NOT perform or finalize any non-trivial change without ensuring that:

- At least one document fully describes:
  - What changed,
  - Why it changed (brief rationale),
  - Any new rules or constraints introduced.
- That document is discoverable by being referenced somewhere in `AGENTS.md` or in an
  existing top-level doc index (if present).

If a requested change cannot be cleanly expressed in existing documentation,
your first step is to update or create the necessary documents. Only then proceed
with code changes.

### 5. Small / trivial changes

For small changes (e.g. typo fixes, minor renames, formatting):

- You do not need to create new documents if the change is already clearly implied by
  existing conventions (e.g. `docs/coding-conventions.md`).
- However, you MUST still ensure that there **exists** a document that conceptually
  covers the area you are touching (coding style, module ownership, etc.). If there is
  no such document at all, create a minimal one that establishes that ground rule.

### 6. Editing this workflow

- You may only relax or remove these documentation rules when explicitly instructed
  by the user.
- If you believe a requested change conflicts with this policy, call it out clearly
  and propose how to adjust the documentation-first workflow instead of silently
  bypassing it.
