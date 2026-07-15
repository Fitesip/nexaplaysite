import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  beginTransaction: vi.fn(),
  rollback: vi.fn(),
  commit: vi.fn(),
  release: vi.fn(),
  executeGrantCommand: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn(async () => 7),
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    getConnection: async () => ({
      query: mocks.query,
      beginTransaction: mocks.beginTransaction,
      rollback: mocks.rollback,
      commit: mocks.commit,
      release: mocks.release,
    }),
  }),
}));

vi.mock("@/lib/itemGrant", () => ({
  executeGrantCommand: mocks.executeGrantCommand,
}));

import { POST } from "@/app/api/cases/claim/route";

describe("case reward claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps a reward unclaimed when RCON is unavailable", async () => {
    mocks.query.mockResolvedValueOnce([
      [
        {
          id: 12,
          won_grant_command: "give {player} diamond",
          minecraft_username: "Steve",
        },
      ],
    ]);
    mocks.executeGrantCommand.mockResolvedValue(false);
    const request = {
      json: async () => ({ userCaseId: 12 }),
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(502);
    expect(mocks.rollback).toHaveBeenCalledOnce();
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
