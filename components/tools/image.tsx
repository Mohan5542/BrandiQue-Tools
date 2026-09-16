"use client";
import { useEffect, useRef, useState } from "react";
import {
  BlobPreview,
  DownloadButton,
  ErrorAlert,
  Field,
  Status,
  UploadDropzone,
} from "@/components/ui";
import {
  bytes,
  decodeImage,
  releaseCanvas,
  canvasBlob,
  message,
  zipDownload,
} from "@/lib/files";
import { imageGeometry } from "@/lib/calculations";
type Entry = {
  id: number;
  file: File;
  width: number;
  height: number;
  output?: Blob;
  ow?: number;
  oh?: number;
};
export default function ImageTool({ slug }: { slug: string }) {
  const [files, setFiles] = useState<Entry[]>([]),
    [w, setW] = useState(1200),
    [h, setH] = useState(800),
    [lock, setLock] = useState(true),
    [percent, setPercent] = useState(100),
    [mode, setMode] = useState(
      slug === "image-compressor" ? "percent" : "dimensions",
    ),
    [fit, setFit] = useState("contain"),
    [type, setType] = useState("image/webp"),
    [quality, setQuality] = useState(0.82),
    [target, setTarget] = useState(0),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  const cancelled = useRef(false);
  const stopWorker = useRef<(() => void) | null>(null);
  const compress = slug === "image-compressor";
  useEffect(
    () => () => {
      cancelled.current = true;
      stopWorker.current?.();
      worker.current?.terminate();
    },
    [],
  );
  async function add(incoming: File[]) {
    cancelled.current = false;
    setError("");
    setBusy(true);
    const entries: Entry[] = [];
    const failures: string[] = [];
    for (const [index, file] of incoming.entries()) {
      if (cancelled.current) break;
      setStatus(`Reading image ${index + 1} of ${incoming.length}…`);
      try {
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type))
          throw new Error("Choose JPG, PNG, WebP or AVIF images.");
        const bmp = await decodeImage(file);
        try {
          if (bmp.width * bmp.height > 60000000)
            throw new Error(
              "This image exceeds 60 megapixels. Use a smaller source.",
            );
          entries.push({
            id: Math.random(),
            file,
            width: bmp.width,
            height: bmp.height,
          });
        } finally {
          bmp.close();
        }
      } catch (e) {
        failures.push(`${file.name}: ${message(e)}`);
      }
    }
    setFiles((prev) => [...prev, ...entries]);
    if (!files.length && entries.length) {
      setW(entries[0].width);
      setH(entries[0].height);
    }
    setError(failures.join(" "));
    setStatus(
      entries.length
        ? `Ready: ${entries.length} image${entries.length === 1 ? "" : "s"} added.`
        : "",
    );
    setBusy(false);
  }
  async function process() {
    setBusy(true);
    setError("");
    cancelled.current = false;
    try {
      for (let i = 0; i < files.length; i++) {
        if (cancelled.current) break;
        const f = files[i];
        setStatus(`Processing image ${i + 1} of ${files.length}…`);
        const width =
          mode === "percent"
            ? Math.max(1, Math.round((f.width * percent) / 100))
            : w;
        let height =
          mode === "percent"
            ? Math.max(1, Math.round((f.height * percent) / 100))
            : h;
        if (lock && mode !== "percent")
          height = Math.max(1, Math.round((width * f.height) / f.width));
        if (
          !Number.isInteger(width) ||
          !Number.isInteger(height) ||
          width < 1 ||
          height < 1 ||
          width * height > 40000000 ||
          width > 16384 ||
          height > 16384
        )
          throw new Error(
            "Use positive whole dimensions, at most 16,384 pixels per side and 40 megapixels total.",
          );
        if (percent <= 0 || percent > 1000)
          throw new Error("Scale must be between 1 and 1000%.");
        async function fallback() {
          const bmp = await decodeImage(f.file);
          const canvas = document.createElement("canvas");
          try {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx)
              throw new Error(
                "Canvas processing is not available in this browser.",
              );
            if (type === "image/jpeg") {
              ctx.fillStyle = "#fff";
              ctx.fillRect(0, 0, width, height);
            }
            const g = imageGeometry(bmp.width, bmp.height, width, height, fit);
            ctx.drawImage(bmp.source, g.x, g.y, g.w, g.h);
            let result = await canvasBlob(canvas, type, quality);
            if (
              type !== "image/png" &&
              target > 0 &&
              result.size > target * 1024
            ) {
              let lo = 0.05,
                hi = quality;
              for (
                let attempt = 0;
                attempt < 7 && !cancelled.current;
                attempt++
              ) {
                const q = (lo + hi) / 2;
                const candidate = await canvasBlob(canvas, type, q);
                if (candidate.size <= target * 1024) {
                  result = candidate;
                  lo = q;
                } else {
                  hi = q;
                  if (candidate.size < result.size) result = candidate;
                }
              }
            }
            if (result.type !== type)
              throw new Error(
                "Selected output format is not supported by this browser.",
              );
            return result;
          } finally {
            bmp.close();
            releaseCanvas(canvas);
          }
        }
        let blob: Blob;
        if (
          typeof OffscreenCanvas !== "undefined" &&
          typeof Worker !== "undefined"
        ) {
          try {
            blob = await new Promise<Blob>((resolve, reject) => {
              const wr = new Worker("/workers/image.js");
              worker.current = wr;
              const done = (error?: string, output?: Blob) => {
                clearTimeout(timer);
                wr.terminate();
                worker.current = null;
                stopWorker.current = null;
                if (error) reject(new Error(error));
                else resolve(output!);
              };
              const timer = setTimeout(
                () => done("Image worker timed out."),
                30000,
              );
              stopWorker.current = () => done("Cancelled.");
              wr.onmessage = (e) => done(e.data.error, e.data.blob);
              wr.onerror = () => done("Image worker unavailable.");
              wr.postMessage({
                file: f.file,
                width,
                height,
                fit,
                type,
                quality,
                target: target * 1024,
              });
            });
          } catch (e) {
            if (cancelled.current) throw e;
            setStatus(
              `Processing image ${i + 1} using browser compatibility mode…`,
            );
            blob = await fallback();
          }
        } else blob = await fallback();
        if (!cancelled.current)
          setFiles((prev) =>
            prev.map((x) =>
              x.id === f.id ? { ...x, output: blob, ow: width, oh: height } : x,
            ),
          );
      }
      if (!cancelled.current)
        setStatus("Processing complete. Compare your outputs below.");
    } catch (e) {
      if (!cancelled.current) setError(message(e));
      if (!cancelled.current) setStatus("");
    } finally {
      setBusy(false);
    }
  }
  const ext = type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1];
  return (
    <>
      <UploadDropzone
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onFiles={add}
        disabled={busy}
      />
      {files.length > 0 && (
        <>
          <div className="fields">
            <Field label="Resize mode">
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="dimensions">Exact dimensions</option>
                <option value="percent">Percentage</option>
              </select>
            </Field>
            {mode === "percent" ? (
              <Field label="Scale (%)">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={percent}
                  onChange={(e) => setPercent(+e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="Width (px)">
                  <input
                    type="number"
                    min="1"
                    value={w}
                    onChange={(e) => {
                      const n = +e.target.value;
                      setW(n);
                      if (lock)
                        setH(
                          Math.round((n * files[0].height) / files[0].width),
                        );
                    }}
                  />
                </Field>
                <Field label="Height (px)">
                  <input
                    type="number"
                    min="1"
                    disabled={lock}
                    value={h}
                    onChange={(e) => setH(+e.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Preset">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    const [x, y] = e.target.value.split("x").map(Number);
                    setW(x);
                    setH(
                      lock
                        ? Math.round((x * files[0].height) / files[0].width)
                        : y,
                    );
                    setMode("dimensions");
                  }
                }}
              >
                <option value="">Custom</option>
                <option value="1920x1080">1920 × 1080</option>
                <option value="1200x630">1200 × 630</option>
                <option value="1080x1080">1080 × 1080</option>
                <option value="800x600">800 × 600</option>
              </select>
            </Field>
            <Field label="Fit">
              <select value={fit} onChange={(e) => setFit(e.target.value)}>
                <option value="contain">Contain (padding)</option>
                <option value="cover">Cover (crop)</option>
                <option value="stretch">Stretch</option>
              </select>
            </Field>
            <Field label="Output format">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="image/webp">WebP</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG (lossless)</option>
              </select>
            </Field>
            <Field label={`Quality · ${Math.round(quality * 100)}%`}>
              <input
                type="range"
                min=".05"
                max="1"
                step=".01"
                disabled={type === "image/png"}
                value={quality}
                onChange={(e) => setQuality(+e.target.value)}
              />
            </Field>
            {compress && (
              <Field label="Target KB (0 = off, best effort)">
                <input
                  type="number"
                  min="0"
                  disabled={type === "image/png"}
                  value={target}
                  onChange={(e) => setTarget(Math.max(0, +e.target.value))}
                />
              </Field>
            )}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={lock}
              onChange={(e) => setLock(e.target.checked)}
            />
            Lock each image’s aspect ratio (width takes priority)
          </label>
          {type === "image/png" && (
            <p className="notice">
              PNG uses lossless encoding. Reduce dimensions or choose WebP / JPG
              to reduce size further.
            </p>
          )}
          <div className="toolbar">
            <button className="button" disabled={busy} onClick={process}>
              {compress ? "Compress images" : "Resize images"}
            </button>
            {busy && (
              <button
                onClick={() => {
                  cancelled.current = true;
                  stopWorker.current?.();
                  setStatus("Cancelled. Completed images remain available.");
                }}
              >
                Cancel processing
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                setFiles([]);
                setStatus("");
                setError("");
              }}
            >
              Reset
            </button>
            {files.some((f) => f.output) && (
              <button
                disabled={busy}
                onClick={() =>
                  zipDownload(
                    files
                      .filter((f) => f.output)
                      .map((f) => ({
                        blob: f.output!,
                        name:
                          f.file.name.replace(/\.[^.]+$/, "") +
                          "." +
                          f.output!.type.split("/")[1],
                      })),
                  ).catch((e) => setError(message(e)))
                }
              >
                Download all as ZIP
              </button>
            )}
          </div>
        </>
      )}
      <ErrorAlert error={error} />
      <Status text={status} />
      {files.map((f) => (
        <div key={f.id} className="file-row">
          <div className="file-info">
            <div>
              <strong>{f.file.name}</strong>
              <small>
                {f.width} × {f.height} · {bytes(f.file.size)}
              </small>
            </div>
            <button
              disabled={busy}
              onClick={() =>
                setFiles((prev) => prev.filter((x) => x.id !== f.id))
              }
            >
              Remove
            </button>
          </div>
          <div className="preview-pair">
            <div>
              <BlobPreview blob={f.file} alt={`Original ${f.file.name}`} />
            </div>
            {f.output && (
              <div>
                <BlobPreview blob={f.output} />
                <p className="muted">
                  {f.ow} × {f.oh} · {bytes(f.output.size)} ·{" "}
                  {((1 - f.output.size / f.file.size) * 100).toFixed(1)}%
                  smaller
                </p>
                {target > 0 && f.output.size > target * 1024 && (
                  <p className="notice">
                    Target size was not reached. Lower dimensions or choose
                    another format.
                  </p>
                )}
                <DownloadButton
                  blob={f.output}
                  name={
                    f.file.name.replace(/\.[^.]+$/, "") +
                    "." +
                    (f.output.type.split("/")[1] || ext)
                  }
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
