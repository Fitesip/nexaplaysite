import { sendRconCommand } from "./rcon";

/**
 * Commands tried in order, first match wins. Plugin-specific subcommands come first:
 * when several TPS-reporting plugins are installed at once, only one of them ends up
 * owning the plain "tps" command (last one loaded generally wins, and that's not
 * something we can predict from the site) — so known plugins (Spark, ClearLag, CMI,
 * EssentialsX) are probed on their own dedicated/namespaced subcommand first, and the
 * bare "tps" is only used as a last-resort fallback. Note vanilla Minecraft has no
 * "/tps" command at all — if nothing above matched, the bare command only works
 * because some plugin registered it.
 */
const TPS_COMMANDS: { command: string; label: string }[] = [
  { command: "spark tps", label: "Spark" },
  { command: "lagg tps", label: "ClearLag" },
  { command: "cmi tps", label: "CMI" },
  { command: "essentials:tps", label: "EssentialsX" },
  { command: "tps", label: "стандартная команда сервера" },
];

function stripFormatting(text: string): string {
  return text.replace(/§./g, "").replace(/&[0-9a-fk-or]/gi, "");
}

/**
 * Pulls the TPS number out of a command's raw output.
 * Prefers a decimal-looking value ("20.0", "19.98", or "19,7" — some server locales
 * format decimals with a comma) because plain duration labels that show up in the
 * same line — "TPS from last 1m, 5m, 15m: 20.0, …" — would otherwise get misread as
 * the TPS itself (e.g. the "1" in "1m"). Falls back to a bare integer near the word
 * "tps" for plugins that print whole numbers (e.g. "Current TPS: 20").
 */
function extractTps(rawOutput: string): number | null {
  const clean = stripFormatting(rawOutput);

  const decimal = clean.match(/(\d{1,2})[.,](\d{1,2})/);
  if (decimal) {
    const value = Number(`${decimal[1]}.${decimal[2]}`);
    if (Number.isFinite(value) && value >= 0 && value <= 20) return value;
  }

  const integer = clean.match(/tps\D{0,12}?(\d{1,2})(?![.,]?\d)/i);
  if (integer) {
    const value = Number(integer[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 20) return value;
  }

  return null;
}

export type TpsResult = { tps: number; source: string; raw: string };

/**
 * Tries each known TPS command in priority order and returns the first one that
 * yields a parseable number. Returns null if RCON isn't reachable at all, or if
 * none of the known commands produced anything usable.
 */
export async function fetchTps(): Promise<TpsResult | null> {
  for (const { command, label } of TPS_COMMANDS) {
    const output = await sendRconCommand(command);
    if (output === null) return null; // RCON unreachable/not configured — no point trying more

    const trimmed = output.trim();
    if (!trimmed || /unknown command/i.test(trimmed)) continue;

    const tps = extractTps(trimmed);
    if (tps !== null) {
      return { tps, source: label, raw: trimmed };
    }
  }
  return null;
}
