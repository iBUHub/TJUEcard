-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    max_subscriptions INTEGER,
    notify_email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(notify_email_enabled IN (0, 1)),
    dingtalk_webhook_url TEXT,
    notify_dingtalk_enabled INTEGER NOT NULL DEFAULT 0 CHECK(
        notify_dingtalk_enabled IN (0, 1)
        AND (notify_dingtalk_enabled = 0 OR length(trim(coalesce(dingtalk_webhook_url, ''))) > 0)
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms Table (Physical Entities)
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Room Identification
    system_id TEXT NOT NULL,
    area_id TEXT NOT NULL, 
    building_id TEXT,
    floor_id TEXT,
    room_id TEXT NOT NULL,
    
    full_name TEXT, 

    -- Query Status
    last_query_time TIMESTAMP,
    last_query_status TEXT CHECK(last_query_status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
    last_electricity FLOAT,
    last_message TEXT,
    
    -- Locking
    next_query_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lock_agent_id TEXT,
    lock_expires_at TIMESTAMP,
    
    UNIQUE(system_id, area_id, building_id, floor_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_polling ON rooms(next_query_time);

-- 3. Subscriptions Table (User <-> Room)
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    
    alias_name TEXT, 
    is_active BOOLEAN DEFAULT 1,
    notification_threshold FLOAT DEFAULT 20,
    last_notified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    UNIQUE(user_id, room_id)
);

-- 4. Electricity History Readings
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    electricity FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE INDEX IF NOT EXISTS idx_readings_room_time ON readings(room_id, recorded_at);

-- 5. Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    last_active_at TIMESTAMP,
    last_ip TEXT,                     -- IPv4 or IPv6 address
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_tasks INTEGER DEFAULT 0 -- Number of successfully submitted queries
);

CREATE INDEX IF NOT EXISTS idx_agents_uuid ON agents(uuid);

-- 6. Email Verification Codes Table
CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- 7. WeChat Test Account Config (per user)
-- Each TJUEcard user can bind at most one WeChat test account.
CREATE TABLE IF NOT EXISTS wechat_test_accounts (
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
-- Extra safety for existing local SQLite databases created before UNIQUE(user_id) was added.
-- ON CONFLICT(user_id) requires a UNIQUE index/constraint on user_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_test_accounts_user_id ON wechat_test_accounts(user_id);
-- Extra safety for existing local SQLite databases created before UNIQUE(app_id) was added.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_test_accounts_app_id ON wechat_test_accounts(app_id);

-- 8. WeChat Followers (openid cache synced from WeChat APIs)
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
