-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
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
    notification_threshold FLOAT DEFAULT -1,
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
