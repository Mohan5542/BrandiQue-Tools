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
    [mode, setMode] = useState("dimensions"),
    [fit, setFit] = useState("contain"),
    [type, setType] = useState("image/webp"),
    [quality, setQuality] = useState(0.82),
    [target, setTarget] = useState(0),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  const cancelled = useRef(false);
  const compress = slug === "image-compressor";
  useEffect(
    () => () => {
      cancelled.current = true;
      worker.current?.terminate();
    },
    [],
  );
  async function add(incoming: File[]) {
    setError("");
    try {
      const entries: Entry[] = [];
      for (const file of incoming) {
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type))
          throw new Error(
            "Choose JPG, PNG, WebP or AVIF images. SVG and animated formats are not accepted here.",
          );
        const bmp = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
        if (bmp.width * bmp.height > 60000000) {
          bmp.close();
          throw new Error(
            "This image exceeds 60 megapixels. Use a smaller source to avoid exhausting browser memory.",
          );
        }
        entries.push({
          id: Math.random(),
          file,
          width: bmp.width,
          height: bmp.height,
        });
        bmp.close();
      }
      setFiles((prev) => [...prev, ...entries]);
      if (!files.length && entries.length) {
        setW(entries[0].width);
        setH(entries[0].height);
      }
    } catch (e) {
      setError(message(e));
    }
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
        let blob: Blob;
        if (typeof OffscreenCanvas !== "undefined") {
          blob = await new Promise<Blob>((resolve, reject) => {
            const wr = new Worker("/workers/image.js");
            worker.current = wr;
            wr.onmessage = (e) => {
              wr.terminate();
              worker.current = null;
              if (e.data.error) {
                reject(new Error(e.data.error));
              } else {
                resolve(e.data.blob);
              }
            };
            wr.onerror = () => {
              wr.terminate();
              reject(new Error("The image worker failed. Try a smaller file."));
            };
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
        } else {
          const bmp = await createImageBitmap(f.file);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          if (type === "image/jpeg") {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, width, height);
          }
          const g = imageGeometry(bmp.width, bmp.height, width, height, fit);
          ctx.drawImage(bmp, g.x, g.y, g.w, g.h);
          bmp.close();
          blob = await canvasBlob(canvas, type, quality);
          releaseCanvas(canvas);
          if (blob.type !== type)
            throw new Error(
              "Selected output format is not supported by this browser.",
            );
        }
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
      setStatus("");
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
