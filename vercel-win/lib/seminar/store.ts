import { randomUUID } from 'node:crypto';
import type { SeminarConfig } from './types';

/**
 * 說明會資料只有兩張表：設定（seminar_configs）和紀錄（seminar_records）。
 * 紀錄用 kind 區分：lead（預約／填表／留名單／筆記）、question、event、order、member、audit、notify。
 *
 * SEMINAR_STORE=postgres 時寫進 Neon（要先跑 db/migrations/0004_seminar.sql）。
 * 沒設時用伺服器記憶體：只給預覽示範，重新部署或閒置後會清空。
 */
export type RecordKind = 'lead' | 'question' | 'event' | 'order' | 'member' | 'audit' | 'notify';
export type SeminarRecord<T = Record<string, unknown>> = { id: string; slug: string; kind: RecordKind; data: T; createdAt: string };

export interface SeminarStore {
  readonly durable: boolean;
  getConfig(slug: string): Promise<SeminarConfig | null>;
  setConfig(slug: string, config: SeminarConfig): Promise<void>;
  deleteConfig(slug: string): Promise<void>;
  listConfigSlugs(): Promise<string[]>;
  add<T extends Record<string, unknown>>(slug: string, kind: RecordKind, data: T): Promise<SeminarRecord<T>>;
  list<T = Record<string, unknown>>(slug: string | null, kind: RecordKind, limit?: number): Promise<SeminarRecord<T>[]>;
  get<T = Record<string, unknown>>(id: string): Promise<SeminarRecord<T> | null>;
  update<T extends Record<string, unknown>>(id: string, patch: Partial<T>): Promise<SeminarRecord<T> | null>;
  remove(id: string): Promise<void>;
}

type Mem = { configs: Map<string, SeminarConfig>; records: SeminarRecord[] };
const g = globalThis as unknown as { __seminarMem?: Mem };

class MemoryStore implements SeminarStore {
  readonly durable = false;
  private get m(): Mem { return (g.__seminarMem ??= { configs: new Map(), records: [] }); }
  async getConfig(slug: string) { const c = this.m.configs.get(slug); return c ? structuredClone(c) : null; }
  async setConfig(slug: string, config: SeminarConfig) { this.m.configs.set(slug, structuredClone(config)); }
  async deleteConfig(slug: string) { this.m.configs.delete(slug); }
  async listConfigSlugs() { return [...this.m.configs.keys()]; }
  async add<T extends Record<string, unknown>>(slug: string, kind: RecordKind, data: T) {
    const rec: SeminarRecord<T> = { id: randomUUID(), slug, kind, data: structuredClone(data), createdAt: new Date().toISOString() };
    this.m.records.push(rec as SeminarRecord);
    if (this.m.records.length > 50_000) this.m.records.splice(0, this.m.records.length - 50_000);
    return rec;
  }
  async list<T>(slug: string | null, kind: RecordKind, limit = 5000) {
    return this.m.records.filter(r => r.kind === kind && (slug === null || r.slug === slug)).slice(-limit).map(r => structuredClone(r)) as SeminarRecord<T>[];
  }
  async get<T>(id: string) { const r = this.m.records.find(x => x.id === id); return r ? structuredClone(r) as SeminarRecord<T> : null; }
  async update<T extends Record<string, unknown>>(id: string, patch: Partial<T>) {
    const r = this.m.records.find(x => x.id === id); if (!r) return null;
    r.data = { ...r.data, ...patch }; return structuredClone(r) as SeminarRecord<T>;
  }
  async remove(id: string) { const i = this.m.records.findIndex(x => x.id === id); if (i >= 0) this.m.records.splice(i, 1); }
}

class PostgresStore implements SeminarStore {
  readonly durable = true;
  private async q(text: string, params: unknown[] = []) {
    const { db } = await import('../payuni/db');
    return db().query(text, params);
  }
  async getConfig(slug: string) { const r = await this.q('SELECT config FROM seminar_configs WHERE slug=$1', [slug]); return (r[0]?.config as SeminarConfig) ?? null; }
  async setConfig(slug: string, config: SeminarConfig) { await this.q('INSERT INTO seminar_configs(slug,config,updated_at) VALUES($1,$2,now()) ON CONFLICT(slug) DO UPDATE SET config=EXCLUDED.config,updated_at=now()', [slug, JSON.stringify(config)]); }
  async deleteConfig(slug: string) { await this.q('DELETE FROM seminar_configs WHERE slug=$1', [slug]); }
  async listConfigSlugs() { return (await this.q('SELECT slug FROM seminar_configs ORDER BY slug')).map(r => String(r.slug)); }
  private row<T>(r: Record<string, unknown>): SeminarRecord<T> { return { id: String(r.id), slug: String(r.slug), kind: r.kind as RecordKind, data: r.data as T, createdAt: new Date(String(r.created_at)).toISOString() }; }
  async add<T extends Record<string, unknown>>(slug: string, kind: RecordKind, data: T) {
    const r = await this.q('INSERT INTO seminar_records(id,slug,kind,data) VALUES($1,$2,$3,$4) RETURNING *', [randomUUID(), slug, kind, JSON.stringify(data)]);
    return this.row<T>(r[0]);
  }
  async list<T>(slug: string | null, kind: RecordKind, limit = 5000) {
    const r = slug === null
      ? await this.q('SELECT * FROM (SELECT * FROM seminar_records WHERE kind=$1 ORDER BY created_at DESC LIMIT $2) t ORDER BY created_at', [kind, limit])
      : await this.q('SELECT * FROM (SELECT * FROM seminar_records WHERE kind=$1 AND slug=$2 ORDER BY created_at DESC LIMIT $3) t ORDER BY created_at', [kind, slug, limit]);
    return r.map(x => this.row<T>(x));
  }
  async get<T>(id: string) { const r = await this.q('SELECT * FROM seminar_records WHERE id=$1', [id]); return r[0] ? this.row<T>(r[0]) : null; }
  async update<T extends Record<string, unknown>>(id: string, patch: Partial<T>) {
    const r = await this.q('UPDATE seminar_records SET data=data||$2::jsonb WHERE id=$1 RETURNING *', [id, JSON.stringify(patch)]);
    return r[0] ? this.row<T>(r[0]) : null;
  }
  async remove(id: string) { await this.q('DELETE FROM seminar_records WHERE id=$1', [id]); }
}

let cached: SeminarStore | null = null;
let override: SeminarStore | null = null;
export function setStore(s: SeminarStore | null) { override = s; }
export function store(): SeminarStore {
  if (override) return override;
  return (cached ??= process.env.SEMINAR_STORE === 'postgres' ? new PostgresStore() : new MemoryStore());
}
export function memoryStore(): SeminarStore { return new MemoryStore(); }
