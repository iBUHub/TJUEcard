import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";
import { SQLParam } from "./d1-adapter";

/**
 * Local SQLite Database Manager
 */
export class LocalDatabase {
    private db: Database.Database;

    constructor(dbPath: string = "./tjuecard.db") {
        // Initialize database connection
        this.db = new Database(dbPath);

        // Enable foreign key constraints
        this.db.pragma("foreign_keys = ON");

        console.log(`📦 Database connected: ${dbPath}`);
    }

    /**
     * Initialize database schema
     */
    initSchema(): void {
        try {
            // Read schema.sql file
            const schemaPath = join(__dirname, "../../schema.sql");
            const schema = readFileSync(schemaPath, "utf-8");

            // Execute all SQL statements in schema
            this.db.exec(schema);

            console.log("✅ Database schema initialized successfully");
        } catch (error) {
            console.error("❌ Database schema initialization failed:", error);
            throw error;
        }
    }

    /**
     * Get database instance
     */
    getDb(): Database.Database {
        return this.db;
    }

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
        console.log("🔒 Database connection closed");
    }

    /**
     * Execute SQL query (adapted for D1 interface)
     */
    async query<T = unknown>(sql: string, params: SQLParam[] = []): Promise<{ results: T[] }> {
        try {
            const stmt = this.db.prepare(sql);
            const results = stmt.all(...params) as T[];
            return { results };
        } catch (error) {
            console.error("❌ SQL query failed:", error);
            throw error;
        }
    }

    /**
     * Execute single query (adapted for D1 interface)
     */
    async queryOne<T = unknown>(sql: string, params: SQLParam[] = []): Promise<T | null> {
        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.get(...params) as T | undefined;
            return result || null;
        } catch (error) {
            console.error("❌ SQL query failed:", error);
            throw error;
        }
    }

    /**
     * Execute insert/update/delete (adapted for D1 interface)
     */
    async execute(
        sql: string,
        params: SQLParam[] = []
    ): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
        try {
            const stmt = this.db.prepare(sql);
            const info = stmt.run(...params);
            return {
                changes: info.changes,
                lastInsertRowid: info.lastInsertRowid,
            };
        } catch (error) {
            console.error("❌ SQL execution failed:", error);
            throw error;
        }
    }

    /**
     * Execute in batch (adapted for D1 interface)
     */
    async batch(statements: Array<{ sql: string; params?: SQLParam[] }>): Promise<unknown[]> {
        const transaction = this.db.transaction((stmts: typeof statements) => {
            return stmts.map(({ sql, params = [] }) => {
                const stmt = this.db.prepare(sql);
                return stmt.run(...params);
            });
        });

        try {
            return transaction(statements);
        } catch (error) {
            console.error("❌ Batch execution failed:", error);
            throw error;
        }
    }
}

// Export singleton instance
let dbInstance: LocalDatabase | null = null;

export function getLocalDb(dbPath?: string): LocalDatabase {
    if (!dbInstance) {
        dbInstance = new LocalDatabase(dbPath);
        dbInstance.initSchema();
    }
    return dbInstance;
}
