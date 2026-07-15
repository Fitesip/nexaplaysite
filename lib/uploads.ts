/**
 * Shared helper for saving user-uploaded files to disk under public/uploads/,
 * so every upload route (avatar, support attachments, ...) validates and
 * stores files the same way instead of repeating the logic.
 */
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export type SavedFile = { url: string; name: string; mime: string; size: number };

/**
 * Validates an uploaded File's type/size against the given allow-list, then
 * writes it to public/uploads/<subdir>/<random-name>.<ext> and returns its
 * public URL plus basic metadata. The filename is randomized so URLs aren't
 * guessable; the original filename is preserved separately for display.
 *
 * Throws a plain Error with a user-facing (Russian) message on any
 * validation failure, so callers can just try/catch and return a 4xx.
 */
export async function saveUploadedFile(
  file: File,
  subdir: string,
  allowedTypes: Record<string, string>,
  maxBytes: number
): Promise<SavedFile> {
  const ext = allowedTypes[file.type];
  if (!ext) {
    throw new Error(`Недопустимый тип файла: ${file.name || file.type}`);
  }
  if (file.size > maxBytes) {
    throw new Error(`Файл слишком большой: ${file.name} (максимум ${Math.floor(maxBytes / 1024 / 1024)} МБ)`);
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${subdir}/${filename}`, name: file.name || filename, mime: file.type, size: file.size };
}

/** Deletes a previously-uploaded file under public/uploads/, ignoring "already gone" errors. */
export async function deleteUploadedFile(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", url));
  } catch {
    /* file already missing — fine */
  }
}
