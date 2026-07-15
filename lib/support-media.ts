/**
 * Shared limits and allow-lists for support ticket media attachments — used by
 * both the API routes (server-side enforcement) and the upload forms
 * (client-side validation for fast feedback). Single source of truth so the
 * two sides can't drift out of sync.
 *
 * Photos and videos are capped separately: photos are small and plentiful,
 * videos are few but much larger, so a single flat file-count/size limit
 * doesn't fit both.
 */

export const SUPPORT_PHOTO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const SUPPORT_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Combined allow-list, for checks that don't care which kind a file is. */
export const SUPPORT_MEDIA_TYPES: Record<string, string> = {
  ...SUPPORT_PHOTO_TYPES,
  ...SUPPORT_VIDEO_TYPES,
};

export const SUPPORT_MAX_PHOTOS = 5;
export const SUPPORT_MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB per photo

export const SUPPORT_MAX_VIDEOS = 3;
export const SUPPORT_MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB per video

export const SUPPORT_PHOTO_ACCEPT = Object.keys(SUPPORT_PHOTO_TYPES).join(",");
export const SUPPORT_VIDEO_ACCEPT = Object.keys(SUPPORT_VIDEO_TYPES).join(",");

/** True if the given mime type is one of the allowed video types. */
export function isVideoMime(mime: string): boolean {
  return mime in SUPPORT_VIDEO_TYPES;
}

/** The per-file size cap that applies to a given mime type (photo vs video). */
export function maxSizeFor(mime: string): number {
  return isVideoMime(mime) ? SUPPORT_MAX_VIDEO_SIZE : SUPPORT_MAX_PHOTO_SIZE;
}

/** Splits a mixed file list into { photos, videos } based on mime type. */
export function splitByKind<T extends { type: string }>(files: T[]): { photos: T[]; videos: T[] } {
  const photos: T[] = [];
  const videos: T[] = [];
  for (const f of files) {
    (isVideoMime(f.type) ? videos : photos).push(f);
  }
  return { photos, videos };
}
