export function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "download";
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName(name);
  a.click();
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
