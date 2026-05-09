import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { getSecurityEnv } from "./env";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const blockedExtensions = new Set(["php", "js", "exe", "sh", "svg"]);

const fileSchema = z.instanceof(File, { message: "A file is required" });

export type ValidatedUpload = {
  file: File;
  sanitizedBaseName: string;
  extension: string;
};

export function sanitizeFilename(name: string): string {
  const basename = path.basename(name).replace(/\.[^.]+$/, "");
  const sanitized = basename
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return sanitized || "image";
}

export function validateUploadFile(fileInput: unknown): ValidatedUpload {
  const file = fileSchema.parse(fileInput);
  const env = getSecurityEnv();

  if (file.size <= 0) {
    throw new Error("Uploaded file is empty");
  }
  if (file.size > env.SECURITY_UPLOAD_MAX_BYTES) {
    throw new Error(`File size exceeds ${env.SECURITY_UPLOAD_MAX_BYTES} bytes`);
  }
  if (!allowedMimeTypes.has(file.type.toLowerCase())) {
    throw new Error("Only JPEG, PNG and WebP files are allowed");
  }

  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  if (!ext || !allowedExtensions.has(ext)) {
    throw new Error("File extension is not allowed");
  }
  if (blockedExtensions.has(ext)) {
    throw new Error("Blocked file extension");
  }

  return {
    file,
    sanitizedBaseName: sanitizeFilename(file.name),
    extension: ext,
  };
}

function resolveSafeUploadDir(): string {
  // Keep all transient uploads isolated from source directories.
  return path.resolve("/tmp/asraa-uploads");
}

export async function persistIsolatedUpload(validated: ValidatedUpload): Promise<{
  absolutePath: string;
  storedFilename: string;
  checksumSha256: string;
}> {
  const uploadDir = resolveSafeUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const storedFilename = `${validated.sanitizedBaseName}-${randomUUID()}.${validated.extension}`;
  const absolutePath = path.resolve(uploadDir, storedFilename);

  if (!absolutePath.startsWith(uploadDir + path.sep)) {
    throw new Error("Unsafe upload path");
  }

  const bytes = Buffer.from(await validated.file.arrayBuffer());
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  await writeFile(absolutePath, bytes, { flag: "wx", mode: 0o600 });

  return { absolutePath, storedFilename, checksumSha256 };
}

export async function runVirusScanPlaceholder(filePath: string): Promise<{ clean: boolean; engine: string }> {
  // Placeholder for ClamAV/S3 event pipeline integration.
  void filePath;
  return { clean: true, engine: "placeholder" };
}

export async function readAsDataUrl(filePath: string, mimeType: string): Promise<string> {
  const bytes = await readFile(filePath);
  const base64 = bytes.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export async function removeIsolatedUpload(filePath: string): Promise<void> {
  await rm(filePath, { force: true });
}
