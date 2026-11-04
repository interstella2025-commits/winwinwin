import { neon } from '@neondatabase/serverless';
/** Minimal Postgres access. Statements use $1..$n placeholders. */
export type Row = Record<string, unknown>;
export type Statement = { text: string; params: unknown[] };
export type Database = { query(text: string, params?: unknown[]): Promise<Row[]>; transaction(statements: Statement[]): Promise<void> };
let override: Database | null = null;
let cached: Database | null = null;
/** Test hook: inject an in-memory database. */
export function setDatabase(db: Database | null) { override = db; }
export function db(): Database {
 if (override) return override;
 if (cached) return cached;
 const url = process.env.DATABASE_URL;
 if (!url) throw new Error('Database unavailable');
 const sql = neon(url);
 cached = {
  query: (text, params = []) => sql.query(text, params) as Promise<Row[]>,
  transaction: async statements => { await sql.transaction(statements.map(s => sql.query(s.text, s.params))); },
 };
 return cached;
}
export async function first<T = Row>(text: string, params: unknown[] = []) { const rows = await db().query(text, params); return (rows[0] as T | undefined) ?? null; }
