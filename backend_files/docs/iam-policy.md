# Access & Security Policy

You MUST treat all user and system data as sensitive. Default mindset: “assume breach” + “least privilege” + “minimal data.”

## 1. Principle of least privilege
- Grant only the minimum permissions needed. Prefer RBAC; avoid “admin can do everything.”
- Default to deny and make permissions explicit.

## 2. Environments & data separation
- Keep dev/staging/prod isolated with separate projects/keys/buckets.
- Never place production secrets or real user data in `.env` samples, tests, or docs. Use fake placeholders.

## 3. Authentication & authorization
- Use managed auth (Firebase Auth/OAuth). Never custom-roll auth.
- Enforce authorization in backend code for every user/tenant resource; require verified identity.

## 4. Secrets & configuration
- No secrets in code. Use env/secret manager. Do not log secrets or full tokens. Redact examples.

## 5. Handling user data & PII
- Collect only what is necessary. Prefer pseudonymous IDs. Do not log raw PII or full bodies. Err on not storing/logging.

## 6. External services, APIs, and tools
- Minimize data sent to third parties. Use TLS. Respect auth models; never bake secrets client-side.

## 7. Logging, monitoring, and debugging
- Log events, not secrets. Use flags/env checks to disable verbose logs in prod.

## 8. Destructive / high-impact operations
- Add safeguards (dry-run, batching, confirmations). Prefer soft deletes where sensible. Avoid unscoped wipes.

## 9. Local and repo access
- Only touch files inside this project unless instructed. Do not commit secrets/keys; surface warnings if seen.

## 10. Modifying this access policy
- Only change this section when explicitly asked. If asked to weaken it, explain risks and propose safer options.

## Deploy service accounts
- Name: `deployserviceaccount@audit-3a7ec.iam.gserviceaccount.com` (CI/CD deploys).
- Usage: authenticate Firebase/GCP deploys via `GOOGLE_APPLICATION_CREDENTIALS` in CI (store the JSON key as a secret, e.g., `GCP_SA_KEY_B64`). Keep least-privilege roles only for deploy (Functions Admin, Cloud Build, Service Account User on itself, Artifact Registry Reader, and Firebase deploy roles as needed). Rotate keys if exposed.
