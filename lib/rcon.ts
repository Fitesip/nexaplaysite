import net from "net";

const SERVERDATA_AUTH = 3;
const SERVERDATA_AUTH_RESPONSE = 2;
const SERVERDATA_EXECCOMMAND = 2;

function buildPacket(id: number, type: number, body: string): Buffer {
  const bodyBuf = Buffer.from(body, "utf8");
  const size = 4 + 4 + bodyBuf.length + 2; // id + type + body + 2 null terminators
  const buf = Buffer.alloc(4 + size);
  buf.writeInt32LE(size, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  bodyBuf.copy(buf, 12);
  buf.writeInt8(0, 12 + bodyBuf.length);
  buf.writeInt8(0, 12 + bodyBuf.length + 1);
  return buf;
}

type ParsedPacket = { id: number; type: number; body: string; size: number };
type RconResult = { output: string | null };

function tryParsePacket(buf: Buffer): ParsedPacket | null {
  if (buf.length < 4) return null;
  const size = buf.readInt32LE(0);
  if (buf.length < 4 + size) return null; // incomplete
  const id = buf.readInt32LE(4);
  const type = buf.readInt32LE(8);
  const body = buf.toString("utf8", 12, 4 + size - 2);
  return { id, type, body, size: 4 + size };
}

function runRconRequest(command: string | null, timeoutMs: number): Promise<RconResult | null> {
  const host = process.env.RCON_HOST;
  const port = Number(process.env.RCON_PORT ?? 25575);
  const password = process.env.RCON_PASSWORD;

  if (!host || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    let authed = false;
    let buffer = Buffer.alloc(0);

    const finish = (result: RconResult | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish(null));
    socket.once("error", () => finish(null));
    socket.once("close", () => finish(null));

    socket.connect(port, host, () => {
      socket.write(buildPacket(1, SERVERDATA_AUTH, password));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const packet = tryParsePacket(buffer);
        if (!packet) return;
        buffer = buffer.subarray(packet.size);

        if (!authed) {
          if (packet.type === SERVERDATA_AUTH_RESPONSE) {
            if (packet.id === -1) {
              finish(null); // bad password
              return;
            }
            authed = true;
            if (command === null) {
              finish({ output: null });
              return;
            }
            socket.write(buildPacket(2, SERVERDATA_EXECCOMMAND, command));
          }
          continue;
        }

        // first response packet after auth is our command's output
        finish({ output: packet.body });
        return;
      }
    });
  });
}

/** Checks that the RCON socket can connect and authenticate successfully. */
export async function checkRconConnection(timeoutMs = 4000): Promise<boolean> {
  return (await runRconRequest(null, timeoutMs)) !== null;
}

/**
 * Sends a single RCON command and returns the server's text response, or null if
 * RCON isn't configured (env vars missing) or the connection/auth failed.
 */
export async function sendRconCommand(command: string, timeoutMs = 4000): Promise<string | null> {
  const result = await runRconRequest(command, timeoutMs);
  return result?.output ?? null;
}

/**
 * Returns the list of currently online player names via RCON's `list` command,
 * or null if RCON isn't configured / unreachable.
 *
 * Note: plugins like EssentialsX can override `/list` (grouping by permission group,
 * hiding vanished players, etc.), which makes the raw output unreliable for an exact
 * membership check. Prefer `sendPrivateMessage` below for anything that needs to
 * positively confirm a specific player — it targets that player directly instead of
 * parsing a list.
 */
export async function getOnlinePlayersViaRcon(): Promise<string[] | null> {
  const output = await sendRconCommand("list");
  if (output === null) return null;

  // Vanilla/Paper format: "There are 2 of a max of 20 players online: Steve, Alex"
  const afterColon = output.split(":")[1];
  if (!afterColon) return [];
  return afterColon
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

const NOT_FOUND_PATTERNS = [
  /no player was found/i,
  /unknown player/i,
  /player.*not found/i,
  /don't know who/i,
  /player.*offline/i,
];

/** True if the tell command's own response indicates the target wasn't reachable. */
function looksLikeDeliveryFailure(output: string): boolean {
  return NOT_FOUND_PATTERNS.some((re) => re.test(output));
}

/**
 * Sends a private, plugin-independent whisper to a specific online player and reports
 * whether it looks like it was actually delivered. Used to hand a verification code
 * straight to the one player who controls that in-game nickname, instead of trying to
 * infer who's online from a (possibly plugin-modified) `/list` response.
 *
 * Tries the vanilla-namespaced command first (`minecraft:tell`) so a `/tell` override
 * from a plugin like EssentialsX can't swallow or reformat it; falls back to the plain
 * `tell` command if the namespaced form isn't recognized by the server.
 */
export async function sendPrivateMessage(
  nickname: string,
  message: string
): Promise<{ delivered: boolean; configured: true } | { configured: false }> {
  const escaped = message.replace(/"/g, '\\"');

  let output = await sendRconCommand(`minecraft:tell ${nickname} ${escaped}`);
  if (output === null) return { configured: false };

  if (/unknown command/i.test(output)) {
    // server doesn't support the vanilla-namespaced override syntax — fall back
    const fallback = await sendRconCommand(`tell ${nickname} ${escaped}`);
    if (fallback === null) return { configured: false };
    output = fallback;
  }

  return { configured: true, delivered: !looksLikeDeliveryFailure(output) };
}
