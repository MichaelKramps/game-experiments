-- Email list: people who asked to hear about new and upcoming games.
-- Rows are never deleted; unsubscribing sets unsubscribed_at.
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TEXT,
  unsub_token TEXT NOT NULL UNIQUE
);
