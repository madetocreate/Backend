# Backend

Mehrmandantenfähiges AI-Backend (Chat-Orchestrierung, Memory, Billing, Ingestion).

Dieses README beschreibt nur die zentralen Punkte Sicherheit, Konfiguration und Architekturüberblick. Details zu Routen und interner Domain-Logik findest du direkt im Code.

## Setup

1. Node.js und npm installieren
2. Dependencies installieren

   npm install

3. Beispiel-Environment anlegen

   cp .env.example .env

4. Server starten (siehe Scripts in package.json, z.B.)

   npm run dev

## Wichtige Umgebungsvariablen

Die wichtigsten Variablen, die dieses Backend erwartet:

- NODE_ENV
- PORT
- OPENAI_API_KEY
- DATA_DIR
- AUTH_SECRET
- AUTH_REQUIRE_SIGNED_TOKENS
- CORS_ORIGIN
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

Eine vollständige Vorlage findest du in .env.example.

## Sicherheit

### Authentifizierung

Unter src/security/auth.ts liegen:

- signAuthToken(payload)
- verifyAuthToken(token)
- authGuard(request, reply)

authGuard erwartet einen Authorization-Header im Format "Bearer <token>" und legt das dekodierte Payload unter request.auth ab. Das Payload muss mindestens tenantId enthalten.

Verwendete Variablen:

- AUTH_SECRET: HMAC-Secret für die Signatur
- AUTH_REQUIRE_SIGNED_TOKENS: "true" oder "false"

Beispiel: Fastify-Route mit Auth-Guard

- preHandler: authGuard

Damit wird der Tenant aus dem Token erzwungen und kann mit den angefragten Ressourcen abgeglichen werden.

### HTTP Security-Header und CORS

Unter src/security/securityPlugins.ts liegt:

- registerSecurityPlugins(app)

Diese Funktion registriert:

- @fastify/helmet für Standard-Sicherheitsheader
- @fastify/cors mit konfigurierbarer Origin-Liste

Konfiguration:

- CORS_ORIGIN: Kommagetrennte Liste erlaubter Origins, z.B.

  http://localhost:3000,https://app.example.com

Integration in den Fastify-Bootstrap:

- Nach dem Erzeugen der Fastify-Instanz registerSecurityPlugins(app) aufrufen.

### Stripe-Webhooks

Unter src/security/stripeWebhook.ts liegen:

- getStripeClient()
- verifyStripeWebhook(rawBody, signatureHeader)

verifyStripeWebhook erwartet den ungeparsten Request-Body (Buffer) und den Inhalt des Stripe-Signatur-Headers Stripe-Signature.

Verwendete Variablen:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

Im Stripe-Webhook-Route-Handler muss:

- der rohe Body an verifyStripeWebhook übergeben werden
- das validierte Event-Objekt weiterverarbeitet werden

Wichtig: Für den Webhook-Endpoint muss die Body-Parsing-Konfiguration so gesetzt sein, dass der rohe Body verfügbar bleibt.

## Architekturüberblick

- src/routes: HTTP-Routen (Fastify)
- src/domain: Business-Logik pro Domäne
- src/infra: Infrastruktur (DB, externe APIs)
- src/integrations: externe Services
- src/security: Auth, Security-Header, Webhook-Verification

Ein typischer Flow:

1. Request trifft Route unter src/routes/*
2. Optional: authGuard prüft Token und Tenant
3. Domain-Service unter src/domain/* verarbeitet die Anfrage
4. Infrastruktur-Schicht unter src/infra/* spricht DB oder externe APIs an
5. Antwort wird an den Client zurückgegeben

## Weitere Verbesserungen

- Tests für Auth (sign/verify/authGuard)
- Tests für Stripe-Webhook-Handling
- Migration der Memory-Persistenz von Datei-basiert auf DB
- Optimierung der Vektorsuche mit spezialisierter Vektor-DB oder DB-Erweiterung
