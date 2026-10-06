import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Media storage. The local adapter writes to /public/uploads for development.
 * To use S3/R2, implement `put` with the AWS SDK and return the public URL — callers don't change.
 */
export interface Storage { put(file: File, folder: string): Promise<string> }

const ALLOWED = /^(audio\/(mpeg|mp3|wav|x-wav|wave|ogg|aac|mp4|x-m4a|flac)|image\/(png|jpeg|webp|gif))$/;
const MAX_BYTES = 10 * 1024 * 1024;

export const localStorage: Storage = {
  async put(file, folder) {
    if (!ALLOWED.test(file.type)) throw new Error("Upload an audio file (MP3, WAV, M4A, OGG, FLAC) or an image (PNG, JPG, WebP).");
    if (file.size > MAX_BYTES) throw new Error("Files can be up to 10 MB.");
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return `/uploads/${folder}/${name}`;
  },
};

export const storage: Storage = localStorage;

/** Returns a URL for a non-empty uploaded file, else null. */
export async function maybeUpload(v: FormDataEntryValue | null, folder: string) {
  if (v instanceof File && v.size > 0) return storage.put(v, folder);
  return null;
}
