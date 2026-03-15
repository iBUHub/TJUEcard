CREATE TABLE IF NOT EXISTS wechat_test_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_id TEXT NOT NULL,
    app_secret TEXT NOT NULL,
    token TEXT NOT NULL,
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
-- Extra safety for existing local SQLite databases created before UNIQUE(user_id) was added.
-- ON CONFLICT(user_id) requires a UNIQUE index/constraint on user_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_test_accounts_user_id ON wechat_test_accounts(user_id);
-- Extra safety for existing local SQLite databases created before UNIQUE(app_id) was added.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_test_accounts_app_id ON wechat_test_accounts(app_id);

-- 8. WeChat Followers (openid binding via subscribe/unsubscribe events)
CREATE TABLE IF NOT EXISTS wechat_followers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_id TEXT NOT NULL,
    openid TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(app_id, openid)
);

CREATE INDEX IF NOT EXISTS idx_wechat_followers_user ON wechat_followers(user_id);
-- Extra safety for existing local SQLite databases created without UNIQUE(app_id, openid).
-- ON CONFLICT(app_id, openid) requires a UNIQUE index/constraint on (app_id, openid) in that order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_followers_app_id_openid ON wechat_followers(app_id, openid);
