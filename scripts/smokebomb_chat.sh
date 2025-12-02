BASE_URL="${BASE_URL:-http://localhost:4000}"
echo "smokebomb chat 1: GET /health"
curl -is "$BASE_URL/health" || true
echo
echo "smokebomb chat 2: POST /chat"
curl -is "$BASE_URL/chat" \
  -X POST \
  -H "Content-Type: application/json" \
  --data-binary @scripts/smokebomb_chat_payload.json || true
echo
