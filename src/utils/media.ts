import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const UPLOAD_URL = "https://api.x.com/2/media/upload";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function uploadMedia(accessToken: string, filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    throw new Error(`Unsupported file type: ${ext} (supported: ${Object.keys(MIME_TYPES).join(", ")})`);
  }

  const stat = statSync(filePath);
  if (stat.size > MAX_IMAGE_SIZE) {
    throw new Error(`File too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB (max 5MB for images)`);
  }

  const fileData = readFileSync(filePath);
  const blob = new Blob([fileData], { type: mimeType });

  const form = new FormData();
  form.append("media", blob, `upload${ext}`);
  form.append("media_category", "tweet_image");

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Media upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const mediaId = data.media_id_string ?? data.id ?? String(data.media_id ?? "");
  if (!mediaId) {
    throw new Error(`Media upload returned no media_id: ${JSON.stringify(data)}`);
  }

  return mediaId;
}
