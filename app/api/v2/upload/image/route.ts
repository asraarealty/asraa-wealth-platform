/**
 * POST /api/v2/upload/image
 *
 * Accepts a multipart/form-data request with a single "file" field containing
 * an image.  Encodes the image as a base64 data URL and returns it so it can
 * be stored as imageUrl on a FeaturedProperty.  Using a data URL avoids any
 * filesystem writes, making this route compatible with read-only serverless
 * environments (e.g. Vercel).
 *
 * This route is matched by Next.js before the /api/v2/:path* rewrite in
 * next.config.js, so it is handled locally rather than being proxied to the
 * backend.
 */

import { NextRequest, NextResponse } from "next/server";

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
  const base64 = Buffer.from(bytes).toString("base64");
  // Use the validated MIME type — never trust the client-supplied filename.
  const url = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ url });
}
