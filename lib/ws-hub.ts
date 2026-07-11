/**
 * Read/write side of the WebSocket client registry that `server.js` populates on
 * connect/disconnect. Both sides talk through `globalThis.__wsHub` — see the comment
 * at the top of `server.js` for why that's used instead of a shared module import.
 */
type Client = { ws: { readyState: number; send: (data: string) => void }; userId: number | null; role: string | null };

const STAFF_ROLES = new Set(["helper", "admin", "main_admin"]);
const OPEN = 1; // WebSocket.OPEN

function getHub(): { clients: Set<Client> } {
  const g = globalThis as unknown as { __wsHub?: { clients: Set<Client> } };
  if (!g.__wsHub) g.__wsHub = { clients: new Set() };
  return g.__wsHub;
}

function safeSend(client: Client, payload: unknown) {
  try {
    if (client.ws.readyState === OPEN) client.ws.send(JSON.stringify(payload));
  } catch {
    // dropped connection — the close/error handler in server.js will clean it up
  }
}

/** Pushes to every socket belonging to a specific user (they may have several tabs open). */
export function sendToUser(userId: number, payload: unknown) {
  let sent = 0;
  for (const client of getHub().clients) {
    if (client.userId === userId) {
      safeSend(client, payload);
      sent++;
    }
  }
  console.log(`[ws-hub] sendToUser(${userId}) -> ${sent} client(s), hub size=${getHub().clients.size}`);
}

/** Pushes to every connected helper/admin/main_admin socket. */
export function sendToStaff(payload: unknown) {
  let sent = 0;
  for (const client of getHub().clients) {
    if (client.role && STAFF_ROLES.has(client.role)) {
      safeSend(client, payload);
      sent++;
    }
  }
  console.log(`[ws-hub] sendToStaff() -> ${sent} client(s), hub size=${getHub().clients.size}`);
}

/** Pushes to every connected socket, logged in or not (used for server-status). */
export function broadcastAll(payload: unknown) {
  for (const client of getHub().clients) safeSend(client, payload);
}
