import { describe, expect, it } from "vitest";
import {
  normalizeGrantCommand,
  executeGrantCommand,
  renderGrantCommand,
  validateGrantCommand,
} from "@/lib/itemGrant";

describe("item grant commands", () => {
  it("normalizes optional commands", () => {
    expect(normalizeGrantCommand("  ")).toBeNull();
    expect(normalizeGrantCommand(" give {player} stone ")).toBe("give {player} stone");
  });

  it("requires a player placeholder and a single line", () => {
    expect(validateGrantCommand("give Steve stone")).toContain("{player}");
    expect(validateGrantCommand("give {player} stone\nsay done")).toContain("одну строку");
    expect(validateGrantCommand("give {username} stone")).toContain("{username}");
    expect(validateGrantCommand("give {player} stone")).toBeNull();
  });

  it("renders player and quantity placeholders without a leading slash", () => {
    expect(renderGrantCommand("/give {player} stone {quantity}", "Steve", 3)).toBe(
      "give Steve stone 3"
    );
  });

  it("reports an unavailable RCON without treating the grant as completed", async () => {
    const sent: string[] = [];
    const granted = await executeGrantCommand(
      "give {player} diamond",
      "Steve",
      1,
      async (command) => {
        sent.push(command);
        return null;
      }
    );

    expect(sent).toEqual(["give Steve diamond"]);
    expect(granted).toBe(false);
  });
});
