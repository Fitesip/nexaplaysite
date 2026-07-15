import { sendRconCommand } from "./rcon";

const PLAYER_PLACEHOLDER = "{player}";
const QUANTITY_PLACEHOLDER = "{quantity}";

export function normalizeGrantCommand(command: string | null | undefined): string | null {
  const normalized = command?.trim() ?? "";
  return normalized ? normalized : null;
}

export function validateGrantCommand(command: string | null): string | null {
  if (!command) return null;
  if (/[\r\n]/.test(command)) return "Команда выдачи должна быть в одну строку";
  const unknownPlaceholder = (command.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) ?? []).find(
    (placeholder) =>
      placeholder !== PLAYER_PLACEHOLDER && placeholder !== QUANTITY_PLACEHOLDER
  );
  if (unknownPlaceholder) {
    return `Неизвестный плейсхолдер ${unknownPlaceholder}`;
  }
  if (!command.includes(PLAYER_PLACEHOLDER)) {
    return `Команда выдачи должна содержать ${PLAYER_PLACEHOLDER}`;
  }
  return null;
}

export function renderGrantCommand(template: string, player: string, quantity = 1): string {
  return template
    .replace(/^\/+/, "")
    .replaceAll(PLAYER_PLACEHOLDER, player)
    .replaceAll(QUANTITY_PLACEHOLDER, String(quantity));
}

export async function executeGrantCommand(
  template: string,
  player: string,
  quantity = 1,
  sender: (command: string) => Promise<string | null> = sendRconCommand
): Promise<boolean> {
  const output = await sender(renderGrantCommand(template, player, quantity));
  return output !== null;
}
