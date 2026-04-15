import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { get as idbGet, set as idbSet } from "idb-keyval";

export type PersistedChatBubble = {
  id: string;
  direction: "in" | "out";
  text: string;
  kind?: "text" | "x402" | "transaction";
  cta?: { label: string; action: "x402" | "transaction"; payload: unknown };
  ctaStatus?: "idle" | "sending" | "failed" | "success";
  ctaError?: string;
  computeVerified?: boolean;
  chatId?: string;
  createdAt: number;
};

type DbState = {
  SQL: SqlJsStatic;
  db: Database;
  persistTimer: number | null;
};

const DB_KEY = "beam_pay_chat_sqlite_v1";

let statePromise: Promise<DbState> | null = null;

function nowMs() {
  return Date.now();
}

function safeString(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function tableColumnNames(db: Database, table: string): Set<string> {
  const res = db.exec(`PRAGMA table_info(${table})`);
  const names = new Set<string>();
  const values = res[0]?.values;
  if (!values) return names;
  for (const row of values) {
    if (row[1] != null) names.add(String(row[1]));
  }
  return names;
}

function migrateChatMessagesTable(db: Database) {
  const cols = tableColumnNames(db, "chat_messages");
  if (!cols.has("kind")) {
    db.run(`ALTER TABLE chat_messages ADD COLUMN kind TEXT;`);
  }
  if (!cols.has("cta_json")) {
    db.run(`ALTER TABLE chat_messages ADD COLUMN cta_json TEXT;`);
  }
  if (!cols.has("cta_status")) {
    db.run(`ALTER TABLE chat_messages ADD COLUMN cta_status TEXT;`);
  }
  if (!cols.has("cta_error")) {
    db.run(`ALTER TABLE chat_messages ADD COLUMN cta_error TEXT;`);
  }
}

function parseCtaJson(raw: string | null | undefined): PersistedChatBubble["cta"] | undefined {
  if (!raw || !raw.trim()) return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return undefined;
    const o = v as Record<string, unknown>;
    const action = o.action === "x402" || o.action === "transaction" ? o.action : null;
    const label = typeof o.label === "string" ? o.label : "";
    if (!action || !label.trim()) return undefined;
    return { label, action, payload: o.payload };
  } catch {
    return undefined;
  }
}

async function getState(): Promise<DbState> {
  if (statePromise) return statePromise;

  statePromise = (async () => {
    const SQL = await initSqlJs({
      // Let the bundler resolve the wasm asset at build time.
      locateFile: (file: string) => new URL(`../../node_modules/sql.js/dist/${file}`, import.meta.url).toString(),
    });

    const persisted = (await idbGet(DB_KEY)) as Uint8Array | ArrayBuffer | number[] | undefined;
    const dbBytes =
      persisted instanceof Uint8Array
        ? persisted
        : persisted instanceof ArrayBuffer
          ? new Uint8Array(persisted)
          : Array.isArray(persisted)
            ? new Uint8Array(persisted)
            : null;

    const db = dbBytes ? new SQL.Database(dbBytes) : new SQL.Database();

    db.exec(`
      PRAGMA journal_mode = MEMORY;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        user_address TEXT NOT NULL,
        direction TEXT NOT NULL,
        text TEXT NOT NULL,
        compute_verified INTEGER,
        chat_id TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_time
      ON chat_messages(agent_id, user_address, created_at);
    `);

    migrateChatMessagesTable(db);

    return { SQL, db, persistTimer: null };
  })();

  return statePromise;
}

async function persistSoon() {
  const st = await getState();
  if (st.persistTimer != null) return;
  st.persistTimer = window.setTimeout(async () => {
    st.persistTimer = null;
    const bytes = st.db.export();
    await idbSet(DB_KEY, bytes);
  }, 500);
}

export async function loadChatBubbles(params: {
  agentId: string;
  userAddress: string;
  limit?: number;
}): Promise<PersistedChatBubble[]> {
  const st = await getState();
  const limit = Math.max(1, Math.min(500, params.limit ?? 200));

  const stmt = st.db.prepare(
    `
    SELECT id, direction, text, kind, cta_json, cta_status, cta_error, compute_verified, chat_id, created_at
    FROM chat_messages
    WHERE agent_id = ? AND user_address = ?
    ORDER BY created_at ASC
    LIMIT ?
  `
  );
  stmt.bind([safeString(params.agentId), safeString(params.userAddress), limit]);

  const out: PersistedChatBubble[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const kindRaw = row.kind != null ? safeString(row.kind) : "";
    const kind =
      kindRaw === "x402" || kindRaw === "transaction" || kindRaw === "text"
        ? (kindRaw as PersistedChatBubble["kind"])
        : undefined;
    const ctaStatusRaw = row.cta_status != null ? safeString(row.cta_status).trim().toLowerCase() : "";
    const ctaStatus =
      ctaStatusRaw === "sending" || ctaStatusRaw === "failed" || ctaStatusRaw === "success"
        ? (ctaStatusRaw as PersistedChatBubble["ctaStatus"])
        : undefined;
    out.push({
      id: safeString(row.id),
      direction: row.direction === "out" ? "out" : "in",
      text: safeString(row.text),
      kind,
      cta: parseCtaJson(row.cta_json != null ? safeString(row.cta_json) : undefined),
      ctaStatus,
      ctaError: row.cta_error ? safeString(row.cta_error) : undefined,
      computeVerified:
        row.compute_verified === null || row.compute_verified === undefined
          ? undefined
          : Boolean(Number(row.compute_verified)),
      chatId: row.chat_id ? safeString(row.chat_id) : undefined,
      createdAt: Number(row.created_at) || nowMs(),
    });
  }
  stmt.free();
  return out;
}

export async function appendChatBubble(params: {
  agentId: string;
  userAddress: string;
  bubble: Omit<PersistedChatBubble, "createdAt"> & { createdAt?: number };
}) {
  const st = await getState();
  const b = params.bubble;
  const createdAt = typeof b.createdAt === "number" ? b.createdAt : nowMs();
  const ctaJson =
    b.cta && typeof b.cta === "object"
      ? JSON.stringify({ label: b.cta.label, action: b.cta.action, payload: b.cta.payload })
      : null;

  st.db.run(
    `
    INSERT OR REPLACE INTO chat_messages
      (id, agent_id, user_address, direction, text, kind, cta_json, cta_status, cta_error, compute_verified, chat_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      safeString(b.id),
      safeString(params.agentId),
      safeString(params.userAddress),
      b.direction === "out" ? "out" : "in",
      safeString(b.text),
      b.kind ? safeString(b.kind) : null,
      ctaJson,
      b.ctaStatus ? safeString(b.ctaStatus) : null,
      b.ctaError ? safeString(b.ctaError) : null,
      typeof b.computeVerified === "boolean" ? (b.computeVerified ? 1 : 0) : null,
      b.chatId ? safeString(b.chatId) : null,
      createdAt,
    ]
  );

  await persistSoon();
}

export async function updateChatBubbleCtaState(params: {
  agentId: string;
  userAddress: string;
  id: string;
  ctaStatus?: PersistedChatBubble["ctaStatus"];
  ctaError?: string | null;
}) {
  const st = await getState();
  st.db.run(
    `
    UPDATE chat_messages
    SET cta_status = ?, cta_error = ?
    WHERE id = ? AND agent_id = ? AND user_address = ?
  `,
    [
      params.ctaStatus ? safeString(params.ctaStatus) : null,
      params.ctaError ? safeString(params.ctaError) : null,
      safeString(params.id),
      safeString(params.agentId),
      safeString(params.userAddress),
    ],
  );
  await persistSoon();
}

export async function clearChatThread(params: { agentId: string; userAddress: string }) {
  const st = await getState();
  st.db.run(`DELETE FROM chat_messages WHERE agent_id = ? AND user_address = ?`, [
    safeString(params.agentId),
    safeString(params.userAddress),
  ]);
  await persistSoon();
}

