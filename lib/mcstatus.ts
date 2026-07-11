import net from "net";

export type ServerStatus =
  | {
      online: true;
      players: { online: number; max: number; sample: string[] };
      motd: string;
      version: string;
      latencyMs: number;
    }
  | { online: false };

function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value;
  do {
    let temp = v & 0b0111_1111;
    v >>>= 7;
    if (v !== 0) temp |= 0b1000_0000;
    bytes.push(temp);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function writeString(value: string): Buffer {
  const strBuf = Buffer.from(value, "utf8");
  return Buffer.concat([writeVarInt(strBuf.length), strBuf]);
}

function packPacket(id: number, ...fields: Buffer[]): Buffer {
  const body = Buffer.concat([writeVarInt(id), ...fields]);
  return Buffer.concat([writeVarInt(body.length), body]);
}

/**
 * Pings a Minecraft: Java Edition server using the Server List Ping protocol
 * (handshake -> status request -> status response). No external dependency,
 * no third-party status API — talks straight to the game server over TCP.
 */
export function pingServer(host: string, port: number, timeoutMs = 4000): Promise<ServerStatus> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const start = Date.now();

    const finish = (result: ServerStatus) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish({ online: false }));
    socket.once("error", () => finish({ online: false }));

    socket.connect(port, host, () => {
      const handshake = packPacket(
        0x00,
        writeVarInt(770), // protocol version, server ignores mismatch for status ping
        writeString(host),
        Buffer.from([(port >> 8) & 0xff, port & 0xff]),
        writeVarInt(1) // next state: status
      );
      const statusRequest = packPacket(0x00);
      socket.write(Buffer.concat([handshake, statusRequest]));
    });

    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        let offset = 0;
        const readVarInt = (): number => {
          let result = 0;
          let shift = 0;
          let byte: number;
          do {
            byte = buffer[offset++];
            result |= (byte & 0x7f) << shift;
            shift += 7;
          } while (byte & 0x80);
          return result;
        };

        readVarInt(); // packet length
        readVarInt(); // packet id
        const jsonLength = readVarInt();
        if (buffer.length - offset < jsonLength) return; // wait for more data

        const jsonStr = buffer.toString("utf8", offset, offset + jsonLength);
        const data = JSON.parse(jsonStr);

        finish({
          online: true,
          players: {
            online: data?.players?.online ?? 0,
            max: data?.players?.max ?? 0,
            sample: Array.isArray(data?.players?.sample)
              ? data.players.sample.map((p: { name?: string }) => p?.name).filter(Boolean)
              : [],
          },
          motd: typeof data?.description === "string" ? data.description : data?.description?.text ?? "",
          version: data?.version?.name ?? "неизвестно",
          latencyMs: Date.now() - start,
        });
      } catch {
        // incomplete packet, keep buffering until timeout or full response
      }
    });
  });
}
