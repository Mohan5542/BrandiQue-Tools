export function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "download";
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function bytes(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1024 ** 2
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 ** 2).toFixed(2)} MB`;
}
export async function zipDownload(files: { name: string; blob: Blob }[]) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [i, f] of files.entries())
    zip.file(`${i + 1}-${safeName(f.name)}`, await f.blob.arrayBuffer());
  download(await zip.generateAsync({ type: "blob" }), "brandique-outputs.zip");
}
export function message(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Processing failed. Try a smaller, valid file or another browser.";
}
export async function canvasBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.85,
) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("Your browser could not encode this image.")),
      type,
      quality,
    ),
  );
}

export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** Metadata fallback only; never substitutes for decoding/validating file contents. */
export function normalizeFile(file: File): File {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mime: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
    pdf: "application/pdf",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };
  if (
    (!file.type ||
      file.type === "application/octet-stream" ||
      file.type === "image/jpg") &&
    mime[ext]
  )
    return new File([file], file.name, {
      type: mime[ext],
      lastModified: file.lastModified,
    });
  return file;
}

export async function decodeImage(
  file: Blob,
): Promise<{
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    } catch {
      /* Some browsers decode more formats through an image element. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        img.src = "";
        reject(new Error("Image decoding timed out. Try a smaller image."));
      }, 15000);
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(
          new Error(
            "This image cannot be decoded. It may be damaged or unsupported by this browser.",
          ),
        );
      };
      img.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      close: () => {
        img.src = "";
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
