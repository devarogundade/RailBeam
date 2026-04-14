import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { get as idbGet, set as idbSet } from "idb-keyval";

export type PersistedChatBubble = {
  id: string;
  direction: "in" | "out";
  text: string;
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
    SELECT id, direction, text, compute_verified, chat_id, created_at
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
    out.push({
      id: safeString(row.id),
      direction: row.direction === "out" ? "out" : "in",
      text: safeString(row.text),
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

  st.db.run(
    `
    INSERT OR REPLACE INTO chat_messages
      (id, agent_id, user_address, direction, text, compute_verified, chat_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      safeString(b.id),
      safeString(params.agentId),
      safeString(params.userAddress),
      b.direction === "out" ? "out" : "in",
      safeString(b.text),
      typeof b.computeVerified === "boolean" ? (b.computeVerified ? 1 : 0) : null,
      b.chatId ? safeString(b.chatId) : null,
      createdAt,
    ]
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

