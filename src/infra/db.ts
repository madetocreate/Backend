import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

const dbDir = path.join(os.homedir(), "Documents", "Backend-Data");
const dbPath = path.join(dbDir, "aklow.db");

function ensureDbDir() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

ensureDbDir();

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  business_name TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_modules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  module_key TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  route TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT
);
`);
