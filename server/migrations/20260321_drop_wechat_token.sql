-- Drop the legacy `token` column from wechat_test_accounts.
-- SQLite/D1 column drops are safest via table recreation to preserve compatibility.
-- Do not wrap this migration in SQL BEGIN/COMMIT statements:
-- Wrangler D1 migrations may reject explicit SQL transactions on remote databases.

ALTER TABLE wechat_test_accounts RENAME TO wechat_test_accounts_old;

CREATE TABLE wechat_test_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_id TEXT NOT NULL,
    app_secret TEXT NOT NULL,
    template_id TEXT,
    notify_wechat_enabled INTEGER NOT NULL DEFAULT 0 CHECK(notify_wechat_enabled IN (0, 1)),
    access_token TEXT,
    access_token_expires_at INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id),
    UNIQUE(app_id)
);

INSERT INTO wechat_test_accounts (
    id,
    user_id,
    app_id,
    app_secret,
    template_id,
    notify_wechat_enabled,
    access_token,
    access_token_expires_at,
    created_at,
    updated_at
)
SELECT
    id,
    user_id,
    app_id,
    app_secret,
    template_id,
    notify_wechat_enabled,
    access_token,
    access_token_expires_at,
    created_at,
    updated_at
FROM wechat_test_accounts_old;

DROP TABLE wechat_test_accounts_old;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_test_accounts_user_id ON wechat_test_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_test_accounts_app_id ON wechat_test_accounts(app_id);
