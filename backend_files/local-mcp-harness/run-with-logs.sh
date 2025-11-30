#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5011}"
PROJECT="${PROJECT:-audit-3a7ec}"
REGION="${REGION:-us-central1}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FORMAT="json"

SERVER_PID=""
TAIL_PID=""
POLL_PID=""

cleanup() {
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null || true
  [[ -n "$TAIL_PID" ]] && kill "$TAIL_PID" 2>/dev/null || true
  [[ -n "$POLL_PID" ]] && kill "$POLL_PID" 2>/dev/null || true
}
trap cleanup EXIT

cd "$ROOT_DIR"

# Start local harness server with prefixed logs
node server.js > >(sed 's/^/[server] /') 2> >(sed 's/^/[server-err] /' >&2) &
SERVER_PID=$!

echo "Harness listening on http://localhost:${PORT} (PID ${SERVER_PID})"

start_log_streams() {
  local service_issue service_read filter interval freshness limit

  # Discover Cloud Run service names (gen2) and normalize to basename
  service_issue=$(gcloud functions describe issueMcpToken --gen2 --region="$REGION" --project="$PROJECT" --format='value(serviceConfig.service)' 2>/dev/null || true)
  service_read=$(gcloud functions describe polymarketReadMcp --gen2 --region="$REGION" --project="$PROJECT" --format='value(serviceConfig.service)' 2>/dev/null || true)
  service_issue=${service_issue:-issuemcptoken}
  service_read=${service_read:-polymarketreadmcp}
  service_issue=$(basename "$service_issue")
  service_read=$(basename "$service_read")

  echo "Discovered Cloud Run services: issueMcpToken=${service_issue}, polymarketReadMcp=${service_read}"

  filter="(resource.type=\"cloud_run_revision\" AND (resource.labels.service_name=\"${service_issue}\" OR resource.labels.service_name=\"${service_read}\")) OR (resource.type=\"cloud_function\" AND (resource.labels.function_name=\"issueMcpToken\" OR resource.labels.function_name=\"polymarketReadMcp\"))"
  echo "Tailing cloud logs with filter: ${filter}"

  # Stream new logs (may miss if tail flakes, so we also poll below)
  if gcloud beta logging tail --help >/dev/null 2>&1; then
    set +e
    gcloud beta logging tail \
      "${filter}" \
      --project="$PROJECT" \
      --format="${LOG_FORMAT}" \
      | sed 's/^/[cloud-tail] /' &
    TAIL_PID=$!
    set -e

    sleep 2
    if ! kill -0 "$TAIL_PID" 2>/dev/null; then
      TAIL_PID=""
    fi
  fi

  # Always run a poller alongside tail to avoid silent gaps
  interval=30
  freshness=600s
  limit=20
  echo "Starting polling every ${interval}s (freshness ${freshness}, limit ${limit})"
  (
    while true; do
      gcloud logging read \
        "resource.type=\"cloud_run_revision\" AND (resource.labels.service_name=\"${service_issue}\" OR resource.labels.service_name=\"${service_read}\") AND severity>=INFO AND NOT protoPayload.serviceName:\"run.googleapis.com\"" \
        --project="$PROJECT" \
        --limit="${limit}" \
        --order=desc \
        --freshness="${freshness}" \
        --format="${LOG_FORMAT}" \
        | sed 's/^/[cloud-poll] /'
      sleep "${interval}"
    done
  ) &
  POLL_PID=$!
}

if command -v gcloud >/dev/null 2>&1; then
  if ! gcloud beta logging tail --help >/dev/null 2>&1; then
    echo "Installing gcloud beta component for logging tail..." >&2
    gcloud components install beta --quiet || true
  fi
  start_log_streams
else
  echo "gcloud not found; skipping cloud log tail" >&2
fi

wait
