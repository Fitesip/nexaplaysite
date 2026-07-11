/**
 * Custom server: wraps Next.js' request handler in a plain http.Server so we can
 * also attach a WebSocket server on the same port (path `/ws`) for realtime push —
 * notifications, support chat messages, and server-status updates.
 *
 * Connected sockets are kept in `globalThis.__wsHub`, a process-wide singleton also
 * read/written by `lib/ws-hub.ts` from inside Next.js API routes. Using `globalThis`
 * (rather than importing this file into route handlers, or vice versa) sidesteps any
 * module-duplication issues between plain `require()` here and Next's own bundling.
 */
const http = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

// IMPORTANT: server.js is a plain Node entrypoint, not compiled/run through Next's
// own CLI, so process.env is empty at this point — Next only loads .env/.env.local
// later, internally, when it compiles API routes (which is why lib/auth.ts "saw" the
// real JWT_SECRET while this file silently fell back to the dev default below).
// Load env vars ourselves, using Next's own loader so file priority (.env.local,
// .env.development, .env, etc.) matches exactly what the rest of the app sees.
const { loadEnvConfig } = require("@next/env");
const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "localhost";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "nexus_session";
const STAFF_ROLES = new Set(["helper", "admin", "main_admin"]);
const STATUS_INTERVAL_MS = 30_000;
const BAN_SWEEP_INTERVAL_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 25_000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let pool;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      // Must match the default in lib/db.ts — see the comment there for why a mismatch
      // here breaks WS identity (support chat / notifications) while leaving
      // everything else looking fine.
      database: process.env.DB_NAME || "nexa",
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function getHub() {
  if (!globalThis.__wsHub) globalThis.__wsHub = { clients: new Set() };
  return globalThis.__wsHub;
}

function broadcast(hub, payload) {
  const msg = JSON.stringify(payload);
  for (const client of hub.clients) {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(msg);
  }
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname !== "/ws") {
      // leave anything else (e.g. Next's own HMR websocket in dev) untouched
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];
    let userId = null;
    let role = null;

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const [rows] = await getPool().query("SELECT role, banned FROM users WHERE id = ?", [payload.userId]);
        if (rows[0] && !rows[0].banned) {
          userId = payload.userId;
          role = rows[0].role;
        }
      } catch (err) {
        // invalid/expired token: connect as anonymous (still gets server:status pushes)
        console.log("[ws] auth failed, connecting as anonymous:", err.message);
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      console.log(`[ws] upgrade: userId=${userId} role=${role}`);
      wss.emit("connection", ws, { userId, role });
    });
  });

  wss.on("connection", (ws, meta) => {
    const hub = getHub();
    const client = { ws, userId: meta.userId, role: meta.role, isAlive: true };
    hub.clients.add(client);

    // The connection can die (network drop, laptop sleep, a proxy silently closing an
    // idle socket) without the ws/TCP layer ever telling either side about it — the
    // socket just looks open forever. Without this check a "dead" client sits in the
    // hub taking pushes that go nowhere, and the browser never gets an onclose to
    // trigger its reconnect logic, so real messages stop arriving until a manual
    // page reload. `pong` marks the client alive again; the sweep below prunes anyone
    // who didn't answer the last ping.
    ws.on("pong", () => {
      client.isAlive = true;
    });

    ws.on("close", () => hub.clients.delete(client));
    ws.on("error", () => hub.clients.delete(client));
  });

  setInterval(() => {
    const hub = getHub();
    for (const client of hub.clients) {
      if (client.isAlive === false) {
        client.ws.terminate();
        hub.clients.delete(client);
        continue;
      }
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch {
        hub.clients.delete(client);
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Single periodic status check shared by every connected client, instead of each
  // browser tab polling /api/server-status on its own. Reuses the existing (cached)
  // REST endpoint so the actual Minecraft-ping logic stays in one place.
  setInterval(() => {
    const hub = getHub();
    if (hub.clients.size === 0) return;
    http
      .get(`http://127.0.0.1:${port}/api/server-status`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            broadcast(hub, { type: "server:status", data: JSON.parse(data) });
          } catch {
            /* ignore malformed/short-lived response */
          }
        });
      })
      .on("error", () => {});
  }, STATUS_INTERVAL_MS);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (WebSocket on /ws)`);
  });

  // Expired temp bans need their `banned` flag cleared even if the player never
  // revisits the site — this sweep does that for both site and forum bans.
  setInterval(async () => {
    try {
      const db = getPool();
      await db.query(
        `UPDATE users SET banned = 0, banned_reason = NULL, banned_until = NULL
         WHERE banned = 1 AND banned_until IS NOT NULL AND banned_until <= NOW()`
      );

      await db.query(
        `UPDATE users SET forum_banned = 0, forum_banned_reason = NULL, forum_banned_until = NULL
         WHERE forum_banned = 1 AND forum_banned_until IS NOT NULL AND forum_banned_until <= NOW()`
      );
    } catch (err) {
      console.error("[ban-sweep] failed:", err);
    }
  }, BAN_SWEEP_INTERVAL_MS);
});
