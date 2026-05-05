/**
 * POST /api/v2/upload/image
 *
 * Accepts a multipart/form-data request with a single "file" field containing
 * an image.  Saves the image to public/uploads/ and returns the public URL so
 * it can be stored as imageUrl on a FeaturedProperty.
 *
 * This route is matched by Next.js before the /api/v2/:path* rewrite in
 * next.config.js, so it is handled locally rather than being proxied to the
 * backend.
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  // Require a Bearer token — same guard used by other protected routes.
  const authHeader = request.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File size must not exceed 5 MB" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Derive extension solely from the validated MIME type — never trust the
  // client-supplied filename to avoid extension spoofing.
  const mimeExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = mimeExt[file.type] ?? "jpg";

  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
  } catch {
    return NextResponse.json(
      { error: "Failed to save image" },
      { status: 500 }
    );
  }

  // Build an absolute public URL so resolveImageUrl() in the UI components
  // treats it as an external URL and does not prefix it with /api/v2.
  // In development Next.js always listens on plain HTTP; in production the
  // reverse proxy sets x-forwarded-proto reliably — fall back to https so the
  // URL is always secure when NODE_ENV is "production".
  const proto =
    process.env.NODE_ENV === "development"
      ? "http"
      : (request.headers.get("x-forwarded-proto") ?? "https");
  const host = request.headers.get("host") ?? "";
  const url = `${proto}://${host}/uploads/${filename}`;

  return NextResponse.json({ url });
}
