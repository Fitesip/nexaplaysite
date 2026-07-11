"use client";

import { avatarSrc, type AvatarSource } from "@/lib/avatar";

type AvatarUser = AvatarSource & { username: string };

/**
 * Square avatar: uploaded photo if present, otherwise the linked Minecraft skin head,
 * otherwise a gradient initial-letter badge. Always square — Minecraft skin heads are
 * pixel art and read as a face only when their corners aren't clipped into a circle.
 */
export default function Avatar({
  user,
  size,
  className = "",
}: {
  user: AvatarUser;
  size: number;
  className?: string;
}) {
  const src = avatarSrc(user, size);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={user.username}
        className={`shrink-0 object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-violet-600 to-cyan-500 font-[var(--font-display)] font-bold text-white ${className}`}
      style={{ width: size, height: size }}
    >
      {user.username.slice(0, 1).toUpperCase()}
    </div>
  );
}
