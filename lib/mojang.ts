/**
 * Resolves a Minecraft Java Edition username against Mojang's public API.
 * This is the real identity check for account linking: it confirms the nickname
 * actually exists as a premium Minecraft account and gives us its stable UUID
 * (usernames can be renamed; the UUID can't change).
 */

export type MojangProfile = { uuid: string; name: string };

function formatUuid(raw: string): string {
  // Mojang returns UUIDs without dashes — re-insert them into the standard 8-4-4-4-12 form.
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

export async function resolveMinecraftProfile(nickname: string): Promise<MojangProfile | null> {
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nickname)}`, {
      cache: "no-store",
    });
    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.id || !data?.name) return null;

    return { uuid: formatUuid(String(data.id)), name: String(data.name) };
  } catch {
    // Mojang API unreachable/down — treat as "couldn't verify" rather than crashing the request
    return null;
  }
}
