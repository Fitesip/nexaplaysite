/** GET /api/server-status — pings the Minecraft server directly and caches the result for 15s. */
import { NextResponse } from "next/server";
import { pingServer, type ServerStatus } from "@/lib/mcstatus";

const CACHE_MS = 15_000;
let cache: { data: ServerStatus; at: number } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  const host = process.env.MC_SERVER_HOST ?? "localhost";
  const port = Number(process.env.MC_SERVER_PORT ?? 25565);

  const data = await pingServer(host, port);
  cache = { data, at: Date.now() };

  return NextResponse.json(data);
}
