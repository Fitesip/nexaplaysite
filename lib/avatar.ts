/**
 * Shared identity helpers used everywhere a user shows up: navbar, profile,
 * forum posts, admin support panel. Keeping the rules in one place means the
 * "photo > Minecraft skin > initial" and "Minecraft nickname > site username"
 * fallbacks stay consistent across the whole app.
 */

export type AvatarSource = {
  avatar_url?: string | null;
  minecraft_uuid?: string | null;
};

export type NameSource = {
  username: string;
  minecraft_username?: string | null;
};

/**
 * Resolves what image (if any) should represent a user:
 * 1. an uploaded profile photo, if set
 * 2. otherwise, the head of their linked Minecraft skin (always square, via mc-heads.net)
 * 3. otherwise null — caller should fall back to an initial-letter badge
 */
export function avatarSrc(user: AvatarSource, size = 64): string | null {
  if (user.avatar_url) return user.avatar_url;
  if (user.minecraft_uuid) return `https://mc-heads.net/avatar/${user.minecraft_uuid}/${size}`;
  return null;
}

/**
 * Site username, plus the linked Minecraft nickname in parentheses if the player has
 * one linked and it differs from their site username. If it's the same string, showing
 * it twice would be redundant, so only the plain username is returned in that case.
 */
export function displayName(user: NameSource): string {
  if (user.minecraft_username && user.minecraft_username !== user.username) {
    return `${user.username} (${user.minecraft_username})`;
  }
  return user.username;
}
