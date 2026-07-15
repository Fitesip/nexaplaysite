/** POST /api/admin/cases/upload-icon — uploads an icon image for a case loot item. Admins only.
 *  Returns the public URL; the editor stores it on the row and saves it with the loot pool. */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/uploads";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("icon");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
  }

  try {
    const saved = await saveUploadedFile(file, "case-items", ALLOWED_TYPES, MAX_SIZE);
    return NextResponse.json({ url: saved.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Не удалось сохранить файл" },
      { status: 415 }
    );
  }
}
