import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";
import { SQLParam } from "./d1-adapter";

/**
 * 本地 SQLite 数据库管理器
 */
export class LocalDatabase {
    private db: Database.Database;

    constructor(dbPath: string = "./tjuecard.db") {
        // 初始化数据库连接
        this.db = new Database(dbPath);

        // 启用外键约束
        this.db.pragma("foreign_keys = ON");

        console.log(`📦 数据库已连接: ${dbPath}`);
    }

    /**
     * 初始化数据库表结构
     */
    initSchema(): void {
        try {
            // 读取 schema.sql 文件
            const schemaPath = join(__dirname, "../../schema.sql");
            const schema = readFileSync(schemaPath, "utf-8");

            // 执行 schema 中的所有 SQL 语句
            this.db.exec(schema);

            console.log("✅ 数据库表结构初始化成功");
        } catch (error) {
            console.error("❌ 数据库表结构初始化失败:", error);
            throw error;
        }
    }

    /**
     * 获取数据库实例
     */
    getDb(): Database.Database {
        return this.db;
    }

    /**
     * 关闭数据库连接
     */
    close(): void {
        this.db.close();
        console.log("🔒 数据库连接已关闭");
    }

    /**
     * 执行 SQL 查询（适配 D1 的查询接口）
     */
    async query<T = unknown>(sql: string, params: SQLParam[] = []): Promise<{ results: T[] }> {
        try {
            const stmt = this.db.prepare(sql);
            const results = stmt.all(...params) as T[];
            return { results };
        } catch (error) {
            console.error("❌ SQL 查询失败:", error);
            throw error;
        }
    }

    /**
     * 执行单条查询（适配 D1 的查询接口）
     */
    async queryOne<T = unknown>(sql: string, params: SQLParam[] = []): Promise<T | null> {
        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.get(...params) as T | undefined;
            return result || null;
        } catch (error) {
            console.error("❌ SQL 查询失败:", error);
            throw error;
        }
    }

    /**
     * 执行插入/更新/删除操作（适配 D1 的执行接口）
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
            console.error("❌ SQL 执行失败:", error);
            throw error;
        }
    }

    /**
     * 批量执行（适配 D1 的批量接口）
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
            console.error("❌ 批量执行失败:", error);
            throw error;
        }
    }
}

// 导出单例实例
let dbInstance: LocalDatabase | null = null;

export function getLocalDb(dbPath?: string): LocalDatabase {
    if (!dbInstance) {
        dbInstance = new LocalDatabase(dbPath);
        dbInstance.initSchema();
    }
    return dbInstance;
}
