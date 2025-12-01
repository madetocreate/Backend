#!/usr/bin/env zsh
BASE_URL=${BASE_URL:-http://localhost:4000}

echo "=== Smoke 1: Einstieg – freier Wunsch ==="
curl -s -X POST "$BASE_URL/agent/wunschkasten/step" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "smoke-tenant",
    "sessionId": "wunschkasten-smoke-1",
    "channel": "app",
    "action": "message",
    "message": "Ich will nie wieder wichtige Nachrichten vergessen",
    "state": {}
  }'
echo

echo "=== Smoke 2: Marketing-Track wählen ==="
curl -s -X POST "$BASE_URL/agent/wunschkasten/step" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "smoke-tenant",
    "sessionId": "wunschkasten-smoke-2",
    "channel": "app",
    "action": "card",
    "selectedCardId": "track_marketing",
    "state": {
      "tenantId": "smoke-tenant",
      "sessionId": "wunschkasten-smoke-2",
      "track": "marketing",
      "goals": [],
      "platforms": [],
      "metadata": {}
    }
  }'
echo

echo "=== Smoke 3: Fun-Track wählen ==="
curl -s -X POST "$BASE_URL/agent/wunschkasten/step" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "smoke-tenant",
    "sessionId": "wunschkasten-smoke-3",
    "channel": "app",
    "action": "card",
    "selectedCardId": "track_fun",
    "state": {
      "tenantId": "smoke-tenant",
      "sessionId": "wunschkasten-smoke-3",
      "track": "fun",
      "goals": [],
      "platforms": [],
      "metadata": {}
    }
  }'
echo
