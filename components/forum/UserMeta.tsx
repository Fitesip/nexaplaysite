"use client";

import Avatar from "@/components/Avatar";
import { displayName } from "@/lib/avatar";

export function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Avatar (photo / Minecraft skin / initial) + author name + "на сервере с …" registration
 * date, used next to every author name on the forum. Shows the linked Minecraft nickname
 * alongside the site username (unless they're identical).
 */
export default function UserMeta({
  username,
  joinedAt,
  avatarUrl = null,
  minecraftUuid = null,
  minecraftUsername = null,
  size = "md",
}: {
  username: string;
  joinedAt: string;
  avatarUrl?: string | null;
  minecraftUuid?: string | null;
  minecraftUsername?: string | null;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? 28 : 36;
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const name = displayName({ username, minecraft_username: minecraftUsername });

  return (
    <div className="flex items-center gap-2.5">
      <Avatar
        user={{ username, avatar_url: avatarUrl, minecraft_uuid: minecraftUuid }}
        size={px}
        className={`font-[var(--font-display)] ${textSize}`}
      />
      <div className="min-w-0 leading-tight">
        <p className={`truncate font-[var(--font-display)] font-semibold text-white ${size === "sm" ? "text-sm" : "text-[15px]"}`}>
          {name}
        </p>
        <p className="text-[11px] text-[var(--color-mist)]/70">на сервере с {formatJoinDate(joinedAt)}</p>
      </div>
    </div>
  );
}
