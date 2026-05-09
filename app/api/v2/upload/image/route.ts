import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, getRequestIp } from "@/lib/security/api";
import { requireAuth, requireRole } from "@/lib/security/auth";
import { getSecurityEnv } from "@/lib/security/env";
import { securityLog } from "@/lib/security/logging";
import { checkRateLimit } from "@/lib/security/rateLimit";
import {
  fileToDataUrl,
  persistIsolatedUpload,
  readAsDataUrl,
  removeIsolatedUpload,
  runVirusScanPlaceholder,
  validateUploadFile,
} from "@/lib/security/upload";

export const runtime = "nodejs";

const uploadFormSchema = z.object({
  file: z.unknown(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const authzError = await requireRole(request, auth.context, ["admin", "super_admin"]);
  if (authzError) return authzError;

  const env = getSecurityEnv();
  const ip = getRequestIp(request);
  const limiter = checkRateLimit(
    `upload:${ip}`,
    env.SECURITY_UPLOAD_RATE_LIMIT_MAX,
    env.SECURITY_UPLOAD_RATE_LIMIT_WINDOW_MS
  );
  if (!limiter.allowed) {
    securityLog("warn", "upload.rate_limited", { ip });
    const response = apiError(request, 429, "RATE_LIMITED", "Too many upload attempts");
    response.headers.set("Retry-After", String(limiter.retryAfterSeconds));
    return response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    securityLog("warn", "upload.invalid_form_data", { ip, error: String(error) });
    return apiError(request, 400, "INVALID_FORM_DATA", "Invalid multipart form data");
  }

  const parse = uploadFormSchema.safeParse({
    file: formData.get("file"),
  });
  if (!parse.success) {
    return apiError(request, 400, "VALIDATION_ERROR", "File is required");
  }

  let isolatedPath = "";
  try {
    const validated = validateUploadFile(parse.data.file);
    let url: string;

    try {
      const persisted = await persistIsolatedUpload(validated);
      isolatedPath = persisted.absolutePath;

      const scanResult = await runVirusScanPlaceholder(isolatedPath);
      if (!scanResult.clean) {
        securityLog("warn", "upload.virus_detected", {
          ip,
          filename: persisted.storedFilename,
          engine: scanResult.engine,
        });
        return apiError(request, 400, "MALWARE_DETECTED", "Uploaded file failed security scan");
      }

      url = await readAsDataUrl(isolatedPath, validated.file.type);
      securityLog("info", "upload.success", {
        ip,
        filename: persisted.storedFilename,
        mime: validated.file.type,
        bytes: validated.file.size,
        checksumSha256: persisted.checksumSha256,
      });
    } catch {
      // Fallback keeps route compatible with serverless platforms that may restrict disk writes.
      url = await fileToDataUrl(validated.file);
      securityLog("warn", "upload.filesystem_unavailable_fallback", {
        ip,
        mime: validated.file.type,
      });
    }

    return apiOk(request, { url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(request, 400, "VALIDATION_ERROR", "Invalid upload payload");
    }
    const message = error instanceof Error ? error.message : "Upload failed";
    securityLog("warn", "upload.rejected", { ip, message });
    return apiError(request, 400, "UPLOAD_REJECTED", "Image upload rejected");
  } finally {
    if (isolatedPath) {
      await removeIsolatedUpload(isolatedPath).catch(() => undefined);
    }
  }
}

export function OPTIONS(request: NextRequest) {
  return apiOk(request, {}, 204);
}
