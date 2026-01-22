import Database from "better-sqlite3";

// 定义允许的 SQL 参数类型
export type SQLParam = string | number | boolean | null | ArrayBuffer;

export interface D1Meta {
    duration: number;
    size_after?: number;
    rows_read?: number;
    rows_written?: number;
    last_row_id?: number;
    changes?: number;
    served_by?: string;
}

export interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    error?: string;
    meta: D1Meta;
}

// 内部使用的 PreparedStatement 接口
export interface D1PreparedStatement {
    bind: (...params: SQLParam[]) => D1PreparedStatement;
    all: <T = unknown>() => Promise<D1Result<T>>;
    first: <T = unknown>(colName?: string) => Promise<T | null>;
    run: () => Promise<D1Result>;
    raw: <T = unknown>() => Promise<T[]>;
    _stmt: Database.Statement;
    _params: SQLParam[];
}

/**
 * 将 better-sqlite3 适配为 D1Database 接口
 * 用于本地开发时替代 Cloudflare D1
 */
export class D1Adapter {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    /**
     * 准备 SQL 语句
     */
    prepare(query: string) {
        const stmt = this.db.prepare(query);

        // 内部辅助构建 PreparedStatement 对象
        const createPreparedStatement = (params: SQLParam[]): D1PreparedStatement => {
            return {
                _params: params,
                // 私有属性, 供 batch 使用
                _stmt: stmt,

                all: async <T = unknown>() => {
                    try {
                        const results = stmt.all(...params) as T[];
                        return { meta: { duration: 0 }, results, success: true };
                    } catch (error: unknown) {
                        return {
                            error: (error as Error).message,
                            meta: { duration: 0 },
                            results: [],
                            success: false,
                        };
                    }
                },

                bind: (...newParams: SQLParam[]) => createPreparedStatement(newParams),

                first: async <T = unknown>(colName?: string) => {
                    try {
                        const result = stmt.get(...params) as T | undefined;
                        if (colName && result) {
                            return (result as Record<string, unknown>)[colName] as T;
                        }
                        return result || null;
                    } catch (error: unknown) {
                        throw new Error((error as Error).message);
                    }
                },

                raw: async <T = unknown>() => {
                    try {
                        const results = stmt.raw().all(...params) as T[];
                        return results;
                    } catch (error: unknown) {
                        throw new Error((error as Error).message);
                    }
                },

                run: async () => {
                    try {
                        const info = stmt.run(...params);
                        return {
                            meta: {
                                changes: info.changes,
                                duration: 0,
                                last_row_id: Number(info.lastInsertRowid),
                            },
                            results: [],
                            success: true,
                        };
                    } catch (error: unknown) {
                        return {
                            error: (error as Error).message,
                            meta: { duration: 0 },
                            results: [],
                            success: false,
                        };
                    }
                },
            };
        };

        // 初始状态（无参数）
        return createPreparedStatement([]);
    }

    /**
     * 批量执行
     */
    async batch(statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]> {
        // better-sqlite3 的事务处理
        const transaction = this.db.transaction((stmts: D1PreparedStatement[]) => {
            return stmts.map(s => {
                const stmt = s._stmt;
                const params = s._params || [];

                if (stmt.reader) {
                    // 如果是读取操作（SELECT）
                    const results = stmt.all(...params);
                    return { meta: { duration: 0 }, results, success: true };
                } else {
                    // 如果是写入操作（INSERT, UPDATE, DELETE）
                    const info = stmt.run(...params);
                    return {
                        meta: {
                            changes: info.changes,
                            duration: 0,
                            last_row_id: Number(info.lastInsertRowid),
                        },
                        results: [],
                        success: true,
                    };
                }
            });
        });

        // 直接执行, 如果失败让其抛出异常
        return transaction(statements);
    }

    /**
     * 执行原始 SQL
     */
    async exec(query: string) {
        try {
            this.db.exec(query);
            return {
                count: 1,
                duration: 0,
            };
        } catch (error: unknown) {
            throw new Error((error as Error).message);
        }
    }

    /**
     * 导出数据库
     */
    async dump(): Promise<ArrayBuffer> {
        throw new Error("dump() is not supported in local development");
    }
}
