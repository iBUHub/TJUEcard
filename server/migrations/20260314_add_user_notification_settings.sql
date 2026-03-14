-- Add per-user notification channel settings (SQLite / Cloudflare D1 compatible).
-- NOTE: Some SQLite environments (e.g. Cloudflare Durable Objects' state.storage.sql)
-- disallow explicit BEGIN/COMMIT. Keep this migration free of transaction statements.
-- Defaults: email enabled, DingTalk disabled.
-- Constraint: DingTalk can only be enabled when webhook URL is non-empty.

-- 1) Email notification switch (default ON)
ALTER TABLE users
ADD COLUMN notify_email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(notify_email_enabled IN (0, 1));

-- 2) DingTalk webhook URL (required to enable DingTalk notifications)
ALTER TABLE users
ADD COLUMN dingtalk_webhook_url TEXT;

-- 3) DingTalk notification switch (default OFF, requires webhook URL when ON)
ALTER TABLE users
ADD COLUMN notify_dingtalk_enabled INTEGER NOT NULL DEFAULT 0 CHECK(
  notify_dingtalk_enabled IN (0, 1)
  AND (notify_dingtalk_enabled = 0 OR length(trim(coalesce(dingtalk_webhook_url, ''))) > 0)
);

-- Defensive backfill for existing rows in older SQLite engines / edge cases
UPDATE users SET notify_email_enabled = 1 WHERE notify_email_enabled IS NULL;
UPDATE users SET notify_dingtalk_enabled = 0 WHERE notify_dingtalk_enabled IS NULL;
