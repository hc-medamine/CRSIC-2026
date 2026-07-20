import { ALLOWED_MIME, IMAGE_MIMES, MEDIA_MAX_BYTES } from "@/lib/media/config";

export type ValidatedUpload = {
  mime: string;
  extension: string;
  buffer: Buffer;
  originalFilename: string;
  byteSize: number;
  isImage: boolean;
};

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.length >= 5 && buf.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

export async function validateUploadFile(
  file: File,
  opts?: { imagesOnly?: boolean },
): Promise<ValidatedUpload> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("File is required");
  }
  if (file.size <= 0) throw new Error("File is empty");
  if (file.size > MEDIA_MAX_BYTES) {
    throw new Error(`File exceeds ${MEDIA_MAX_BYTES / (1024 * 1024)} MB limit`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  if (!sniffed || !(sniffed in ALLOWED_MIME)) {
    throw new Error("File type not allowed (use JPEG, PNG, WebP, or PDF)");
  }

  const declared = (file.type || "").toLowerCase();
  if (declared && declared !== sniffed && !(declared === "image/jpg" && sniffed === "image/jpeg")) {
    // Allow empty/browser-odd declared types; reject clear mismatches
    if (declared.startsWith("image/") || declared === "application/pdf") {
      throw new Error("File content does not match declared type");
    }
  }

  if (opts?.imagesOnly && !IMAGE_MIMES.has(sniffed)) {
    throw new Error("Only images are allowed for this field (JPEG, PNG, WebP)");
  }

  return {
    mime: sniffed,
    extension: ALLOWED_MIME[sniffed],
    buffer,
    originalFilename: file.name || `upload.${ALLOWED_MIME[sniffed]}`,
    byteSize: buffer.length,
    isImage: IMAGE_MIMES.has(sniffed),
  };
}
