"use client";

/** Browser-only image variants. Master long edge ≤1920; card 16:9 ~800px. */

export const MASTER_MAX_EDGE = 1920;
export const CARD_WIDTH = 800;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode image"));
          return;
        }
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.88,
    );
  });
}

function scaleMaster(sw: number, sh: number): { w: number; h: number } {
  const edge = Math.max(sw, sh);
  if (edge <= MASTER_MAX_EDGE) return { w: Math.round(sw), h: Math.round(sh) };
  const s = MASTER_MAX_EDGE / edge;
  return { w: Math.max(1, Math.round(sw * s)), h: Math.max(1, Math.round(sh * s)) };
}

export async function fileFromCrop(
  img: HTMLImageElement,
  crop: { x: number; y: number; w: number; h: number },
): Promise<File> {
  const size = scaleMaster(crop.w, crop.h);
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, size.w, size.h);
  return canvasToJpeg(canvas, "cover.jpg");
}

export async function cardFileFromImage(img: HTMLImageElement): Promise<File> {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const targetRatio = 16 / 9;
  const srcRatio = srcW / srcH;
  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;
  if (srcRatio > targetRatio) {
    sw = srcH * targetRatio;
    sx = (srcW - sw) / 2;
  } else {
    sh = srcW / targetRatio;
    sy = (srcH - sh) / 2;
  }
  const width = Math.min(CARD_WIDTH, Math.round(sw));
  const height = Math.max(1, Math.round(width / targetRatio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not make card image");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  return canvasToJpeg(canvas, "cover-card.jpg");
}

export async function variantsFromFile(file: File): Promise<{ master: File; card: File }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const master = await fileFromCrop(img, {
      x: 0,
      y: 0,
      w: img.naturalWidth,
      h: img.naturalHeight,
    });
    const croppedUrl = URL.createObjectURL(master);
    try {
      const croppedImg = await loadImage(croppedUrl);
      const card = await cardFileFromImage(croppedImg);
      return { master, card };
    } finally {
      URL.revokeObjectURL(croppedUrl);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function cardFromCrop(
  img: HTMLImageElement,
  crop: { x: number; y: number; w: number; h: number },
): Promise<File> {
  const cropped = await fileFromCrop(img, crop);
  const url = URL.createObjectURL(cropped);
  try {
    const croppedImg = await loadImage(url);
    return cardFileFromImage(croppedImg);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function variantsFromCrop(
  img: HTMLImageElement,
  crop: { x: number; y: number; w: number; h: number },
): Promise<{ master: File; card: File }> {
  const master = await fileFromCrop(img, crop);
  const url = URL.createObjectURL(master);
  try {
    const cropped = await loadImage(url);
    const card = await cardFileFromImage(cropped);
    return { master, card };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { loadImage };
