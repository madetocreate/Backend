BASE_URL="${BASE_URL:-http://localhost:3001}"
TENANT_ID="${TEST_TENANT_ID:-test-tenant}"

echo "smokebomb 1: GET /health"
curl -is "$BASE_URL/health" || true
echo

echo "smokebomb 2: POST /ingest/review without auth"
curl -is "$BASE_URL/ingest/review" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$(printf '{"tenantId":"%s","content":"%s"}' "$TENANT_ID" "smoketest")" || true
echo

echo "smokebomb 3: POST /ingest/review with auth"
TOKEN=$(node - << 'NODE'
const crypto = require('crypto');
function base64Url(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
const secret = process.env.AUTH_SECRET || 'replace-with-long-random-string';
const tenantId = process.env.TEST_TENANT_ID || 'test-tenant';
const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = base64Url(JSON.stringify({ tenantId }));
const signingInput = header + '.' + payload;
const signature = base64Url(crypto.createHmac('sha256', secret).update(signingInput).digest());
process.stdout.write(signingInput + '.' + signature);
NODE
)
curl -is "$BASE_URL/ingest/review" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$(printf '{"tenantId":"%s","content":"%s"}' "$TENANT_ID" "smoketest with auth")" || true
echo
