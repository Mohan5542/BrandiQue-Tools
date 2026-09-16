"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocument } from "pdf-lib";
import type { RenderTask } from "pdfjs-dist";
import { loadPdf } from "@/lib/documents";
import { canvasBlob, message, zipDownload } from "@/lib/files";
import {
  DownloadButton,
  ErrorAlert,
  Field,
  Status,
  UploadDropzone,
} from "@/components/ui";
type Mark = {
  kind: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  text: string;
  color: string;
  size: number;
  points?: { x: number; y: number }[];
  image?: string;
};
type Page = {
  id: number;
  source: number;
  index: number;
  rotation: number;
  marks: Mark[];
  crop?: number;
};
export default function PdfTool({ slug }: { slug: string }) {
  const [sources, setSources] = useState<Uint8Array[]>([]),
    [pages, setPages] = useState<Page[]>([]),
    [selected, setSelected] = useState(0),
    [mode, setMode] = useState("text"),
    [text, setText] = useState("Your text"),
    [color, setColor] = useState("#111111"),
    [size, setSize] = useState(18),
    [margin, setMargin] = useState(20),
    [quality, setQuality] = useState(0.7),
    [dpi, setDpi] = useState(100),
    [numbering, setNumbering] = useState(false),
    [output, setOutput] = useState<Blob | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [rendering, setRendering] = useState(false),
    [asset, setAsset] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    base = useRef<HTMLCanvasElement | null>(null),
    start = useRef<{ x: number; y: number } | null>(null),
    stroke = useRef<{ x: number; y: number }[]>([]);
  const editor = slug === "pdf-editor";
  const previewDocs = useRef(new Map<number, ReturnType<typeof loadPdf>>());
  const baseKey = useRef("");
  const previewReady = useRef(false);
  function clearPreviews() {
    previewReady.current = false;
    baseKey.current = "";
    for (const doc of previewDocs.current.values())
      void doc.then((pdf) => pdf.destroy()).catch(() => {});
    previewDocs.current.clear();
    if (base.current) {
      base.current.width = 0;
      base.current = null;
    }
  }
  useEffect(() => () => clearPreviews(), []);
  async function add(files: File[]) {
    setBusy(true);
    setError("");
    setOutput(null);
    try {
      setStatus("Reading PDF pages…");
      const { PDFDocument } = await import("pdf-lib");
      const news: Uint8Array[] = [],
        items: Page[] = [];
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".pdf"))
          throw new Error("Choose PDF files.");
        if (file.size > 100 * 1024 * 1024)
          throw new Error(
            "Use PDFs below 100 MB to avoid browser memory exhaustion.",
          );
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(data);
        const si = sources.length + news.length;
        news.push(data);
        doc.getPages().forEach((p, i) =>
          items.push({
            id: Math.random(),
            source: si,
            index: i,
            rotation: 0,
            marks: [],
          }),
        );
      }
      setSources((prev) => [...prev, ...news]);
      setPages((prev) => [...prev, ...items]);
      setStatus(`Added ${items.length} pages.`);
    } catch (e) {
      setError(
        message(e).includes("encrypted")
          ? "Password-protected PDFs are not supported. Unlock a copy locally first."
          : "Could not read this PDF. It may be encrypted, corrupted or too large.",
      );
    } finally {
      setBusy(false);
    }
  }
  function paint(marks: Mark[]) {
    const c = canvas.current,
      b = base.current;
    if (!c || !b) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(b, 0, 0);
    for (const m of marks) {
      ctx.strokeStyle = m.color;
      ctx.fillStyle = m.color;
      ctx.lineWidth = m.size;
      const x = m.x * c.width,
        y = m.y * c.height,
        xx = m.x2 * c.width,
        yy = m.y2 * c.height;
      if (m.kind === "text") {
        ctx.font = `${m.size}px Arial`;
        ctx.fillText(m.text, x, y);
      } else if (m.kind === "highlight") {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, xx - x, yy - y);
        ctx.globalAlpha = 1;
      } else if (m.kind === "rectangle") {
        ctx.strokeRect(x, y, xx - x, yy - y);
      } else if (m.kind === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          (x + xx) / 2,
          (y + yy) / 2,
          Math.abs(xx - x) / 2,
          Math.abs(yy - y) / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else if (m.kind === "image" && m.image) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, x, y, xx - x, yy - y);
        img.src = m.image;
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
        if (m.points)
          m.points.forEach((p) => ctx.lineTo(p.x * c.width, p.y * c.height));
        else ctx.lineTo(xx, yy);
        ctx.stroke();
        if (m.kind === "arrow") {
          const a = Math.atan2(yy - y, xx - x);
          ctx.beginPath();
          ctx.moveTo(xx - 14 * Math.cos(a - 0.5), yy - 14 * Math.sin(a - 0.5));
          ctx.lineTo(xx, yy);
          ctx.lineTo(xx - 14 * Math.cos(a + 0.5), yy - 14 * Math.sin(a + 0.5));
          ctx.stroke();
        }
      }
    }
  }
  useEffect(() => {
    let dead = false;
    let task: RenderTask | undefined;
    const p = pages[selected];
    if (!p) {
      previewReady.current = false;
      return;
    }
    setOutput(null);
    const key = `${p.source}:${p.index}:${p.rotation}`;
    // Annotation edits reuse the existing page pixels instead of reparsing the PDF.
    if (baseKey.current === key && base.current) {
      previewReady.current = true;
      setRendering(false);
      paint(p.marks);
      return;
    }
    previewReady.current = false;
    setRendering(true);
    async function render() {
      const b = document.createElement("canvas");
      try {
        const c = canvas.current;
        if (!c) return;
        if (p.source < 0) {
          b.width = 595;
          b.height = 842;
          const ctx = b.getContext("2d")!;
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, b.width, b.height);
        } else {
          if (!previewDocs.current.has(p.source)) {
            const pending = loadPdf(sources[p.source].slice().buffer);
            previewDocs.current.set(p.source, pending);
            void pending.catch(() => {
              if (previewDocs.current.get(p.source) === pending)
                previewDocs.current.delete(p.source);
            });
          }
          const pdf = await previewDocs.current.get(p.source)!;
          if (dead) return;
          const page = await pdf.getPage(p.index + 1);
          if (dead) return;
          const normal = page.getViewport({ scale: 1 });
          if (normal.width * normal.height > 20000000)
            throw new Error("PDF page is too large to preview.");
          const scale = 1;
          const viewport = page.getViewport({
            scale,
            rotation: (page.rotate + p.rotation) % 360,
          });
          b.width = viewport.width;
          b.height = viewport.height;
          task = page.render({
            canvas: b,
            canvasContext: b.getContext("2d")!,
            viewport,
          });
          await task.promise;
        }
        if (dead) return;
        if (base.current) base.current.width = 0;
        base.current = b;
        baseKey.current = key;
        c.width = b.width;
        c.height = b.height;
        previewReady.current = true;
        paint(p.marks);
      } catch {
        if (!dead) setError("Page preview failed. Try another PDF.");
      } finally {
        if (!dead) setRendering(false);
        if (base.current !== b) b.width = 0;
      }
    }
    void render();
    return () => {
      dead = true;
      task?.cancel();
    };
  }, [pages, selected, sources]);
  useEffect(() => setOutput(null), [pages, numbering, quality, dpi]);
  function update(fn: (p: Page) => Page) {
    setOutput(null);
    setPages((prev) => prev.map((p, i) => (i === selected ? fn(p) : p)));
  }
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  async function build(single?: Page[]) {
    const { PDFDocument, StandardFonts, degrees } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const cache = new Map<number, PDFDocument>();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const chosen = single || pages;
    for (let j = 0; j < chosen.length; j++) {
      const p = chosen[j];
      setStatus(`Exporting page ${j + 1} of ${chosen.length}…`);
      let page;
      if (p.source < 0) page = doc.addPage();
      else {
        if (!cache.has(p.source))
          cache.set(p.source, await PDFDocument.load(sources[p.source]));
        const [copied] = await doc.copyPages(cache.get(p.source)!, [p.index]);
        page = doc.addPage(copied);
        page.setRotation(
          degrees((page.getRotation().angle + p.rotation) % 360),
        );
      }
      if (p.marks.length) {
        /* Flatten a rendered page plus annotations to preserve exact rotated coordinates. */ const temp =
          await PDFDocument.create();
        const [cp] = await temp.copyPages(doc, [doc.getPageCount() - 1]);
        temp.addPage(cp);
        const preview = await loadPdf(new Uint8Array(await temp.save()).buffer);
        try {
          const pg = await preview.getPage(1);
          const vp = pg.getViewport({ scale: 1.5 });
          const c = document.createElement("canvas");
          c.width = vp.width;
          c.height = vp.height;
          await pg.render({
            canvas: c,
            canvasContext: c.getContext("2d")!,
            viewport: vp,
          }).promise;
          const ctx = c.getContext("2d")!;
          for (const m of p.marks) {
            const x = m.x * c.width,
              y = m.y * c.height,
              xx = m.x2 * c.width,
              yy = m.y2 * c.height;
            ctx.strokeStyle = m.color;
            ctx.fillStyle = m.color;
            ctx.lineWidth = m.size * 1.5;
            if (m.kind === "text") {
              ctx.font = `${m.size * 1.5}px Arial`;
              ctx.fillText(m.text, x, y);
            } else if (m.kind === "highlight") {
              ctx.globalAlpha = 0.3;
              ctx.fillRect(x, y, xx - x, yy - y);
              ctx.globalAlpha = 1;
            } else if (m.kind === "rectangle") {
              ctx.strokeRect(x, y, xx - x, yy - y);
            } else if (m.kind === "circle") {
              ctx.beginPath();
              ctx.ellipse(
                (x + xx) / 2,
                (y + yy) / 2,
                Math.abs(xx - x) / 2,
                Math.abs(yy - y) / 2,
                0,
                0,
                Math.PI * 2,
              );
              ctx.stroke();
            } else if (m.kind === "image" && m.image) {
              const img = await createImageBitmap(
                await (await fetch(m.image)).blob(),
              );
              ctx.drawImage(img, x, y, xx - x, yy - y);
              img.close();
            } else {
              ctx.beginPath();
              ctx.moveTo(x, y);
              if (m.points)
                m.points.forEach((pt) =>
                  ctx.lineTo(pt.x * c.width, pt.y * c.height),
                );
              else ctx.lineTo(xx, yy);
              ctx.stroke();
              if (m.kind === "arrow") {
                const a = Math.atan2(yy - y, xx - x);
                ctx.beginPath();
                ctx.moveTo(
                  xx - 21 * Math.cos(a - 0.5),
                  yy - 21 * Math.sin(a - 0.5),
                );
                ctx.lineTo(xx, yy);
                ctx.lineTo(
                  xx - 21 * Math.cos(a + 0.5),
                  yy - 21 * Math.sin(a + 0.5),
                );
                ctx.stroke();
              }
            }
          }
          const image = await doc.embedPng(
            await (await canvasBlob(c)).arrayBuffer(),
          );
          doc.removePage(doc.getPageCount() - 1);
          page = doc.addPage([vp.width / 1.5, vp.height / 1.5]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
          });
          c.width = 0;
        } finally {
          await preview.destroy();
        }
      }
      if (p.crop) {
        const m = p.crop;
        if (m * 2 >= Math.min(page.getWidth(), page.getHeight()))
          throw new Error("Crop margin is too large for this page.");
        page.setCropBox(
          m,
          m,
          page.getWidth() - 2 * m,
          page.getHeight() - 2 * m,
        );
      }
      if (numbering)
        page.drawText(String(j + 1), {
          x: page.getWidth() / 2,
          y: 20,
          size: 10,
          font,
        });
    }
    return new Blob([new Uint8Array(await doc.save())], {
      type: "application/pdf",
    });
  }
  async function exportPdf(split = false) {
    setBusy(true);
    setError("");
    setOutput(null);
    try {
      if (!pages.length) throw new Error("Add at least one page.");
      if (split) {
        const outputs = [];
        for (let i = 0; i < pages.length; i++)
          outputs.push({
            name: `page-${i + 1}.pdf`,
            blob: await build([pages[i]]),
          });
        await zipDownload(outputs);
        setStatus("Split archive downloaded.");
      } else if (slug === "pdf-compressor") {
        const { PDFDocument } = await import("pdf-lib");
        const input = await build();
        const pdf = await loadPdf(await input.arrayBuffer());
        const doc = await PDFDocument.create();
        try {
          for (let i = 1; i <= pdf.numPages; i++) {
            setStatus(`Compressing page ${i} of ${pdf.numPages}…`);
            const page = await pdf.getPage(i),
              vp = page.getViewport({ scale: dpi / 72 });
            if (vp.width * vp.height > 40000000)
              throw new Error("Page too large. Lower the resolution.");
            const c = document.createElement("canvas");
            c.width = vp.width;
            c.height = vp.height;
            await page.render({
              canvas: c,
              canvasContext: c.getContext("2d")!,
              viewport: vp,
            }).promise;
            const image = await doc.embedJpg(
              await (await canvasBlob(c, "image/jpeg", quality)).arrayBuffer(),
            );
            const out = doc.addPage([
              (vp.width * 72) / dpi,
              (vp.height * 72) / dpi,
            ]);
            out.drawImage(image, {
              x: 0,
              y: 0,
              width: out.getWidth(),
              height: out.getHeight(),
            });
            c.width = 0;
          }
          setOutput(
            new Blob([new Uint8Array(await doc.save())], {
              type: "application/pdf",
            }),
          );
        } finally {
          await pdf.destroy();
        }
        setStatus("Rasterized PDF ready. Inspect quality before use.");
      } else {
        setOutput(await build());
        setStatus("PDF ready. Inspect the downloaded file before sharing.");
      }
    } catch (e) {
      setError(message(e));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <UploadDropzone accept=".pdf" multiple onFiles={add} disabled={busy} />
      {pages.length > 0 && (
        <>
          <div className="page-chips" aria-label="PDF pages">
            {pages.map((p, i) => (
              <button
                key={p.id}
                className={i === selected ? "active" : ""}
                onClick={() => setSelected(i)}
              >
                Page {i + 1}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <button
              disabled={busy || selected === 0}
              onClick={() => {
                const copy = [...pages];
                [copy[selected - 1], copy[selected]] = [
                  copy[selected],
                  copy[selected - 1],
                ];
                setPages(copy);
                setSelected(selected - 1);
              }}
            >
              Move left
            </button>
            <button
              disabled={busy || selected === pages.length - 1}
              onClick={() => {
                const copy = [...pages];
                [copy[selected + 1], copy[selected]] = [
                  copy[selected],
                  copy[selected + 1],
                ];
                setPages(copy);
                setSelected(selected + 1);
              }}
            >
              Move right
            </button>
            <button
              disabled={busy}
              onClick={() =>
                update((p) => ({
                  ...p,
                  rotation: (p.rotation + 90) % 360,
                  marks: [],
                }))
              }
            >
              Rotate 90° (clears overlays)
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setPages((p) => p.filter((_, i) => i !== selected));
                setSelected(Math.max(0, selected - 1));
              }}
            >
              Delete page
            </button>
            <button
              disabled={busy}
              onClick={() =>
                setPages((p) => [
                  ...p.slice(0, selected + 1),
                  { ...p[selected], id: Math.random() },
                  ...p.slice(selected + 1),
                ])
              }
            >
              Duplicate
            </button>
            <button
              disabled={busy}
              onClick={() =>
                setPages((p) => [
                  ...p,
                  {
                    id: Math.random(),
                    source: -1,
                    index: 0,
                    rotation: 0,
                    marks: [],
                  },
                ])
              }
            >
              Add blank page
            </button>
          </div>
          <div className={editor ? "editor-layout" : ""}>
            {editor && (
              <div className="editor-controls">
                <Field label="Annotation tool">
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    {[
                      "text",
                      "draw",
                      "signature",
                      "highlight",
                      "underline",
                      "rectangle",
                      "circle",
                      "arrow",
                      "image",
                    ].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Text">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </Field>
                <Field label="Color">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </Field>
                <Field label="Font size / stroke width">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={size}
                    onChange={(e) =>
                      setSize(Math.max(1, Math.min(100, +e.target.value)))
                    }
                  />
                </Field>
                {mode === "image" && (
                  <Field label="Overlay image">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = () => setAsset(String(reader.result));
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                  </Field>
                )}
                <Field label="Crop margin (PDF points)">
                  <input
                    type="number"
                    min="0"
                    value={margin}
                    onChange={(e) => setMargin(Math.max(0, +e.target.value))}
                  />
                </Field>
                <button onClick={() => update((p) => ({ ...p, crop: margin }))}>
                  Apply crop on export
                </button>
                <button
                  onClick={() => update((p) => ({ ...p, crop: undefined }))}
                >
                  Remove crop
                </button>
                <button
                  onClick={() =>
                    update((p) => ({ ...p, marks: p.marks.slice(0, -1) }))
                  }
                >
                  Undo annotation
                </button>
                <p className="notice">
                  Click to place text. Drag for other marks. Annotated pages are
                  flattened to images; untouched pages retain their original
                  content. Crop is applied during export.
                </p>
              </div>
            )}
            <div className="canvas-wrap">
              {rendering && <p aria-live="polite">Rendering page preview…</p>}
              <canvas
                aria-busy={rendering}
                ref={canvas}
                aria-label="PDF page preview and annotation canvas"
                onPointerDown={(e) => {
                  if (!editor || busy || !previewReady.current) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  start.current = point(e);
                  stroke.current = [start.current];
                }}
                onPointerMove={(e) => {
                  if (start.current) {
                    stroke.current.push(point(e));
                    if (mode === "draw" || mode === "signature")
                      paint([
                        ...pages[selected].marks,
                        {
                          kind: "draw",
                          ...start.current,
                          x2: point(e).x,
                          y2: point(e).y,
                          text,
                          color,
                          size,
                          points: stroke.current,
                        },
                      ]);
                  }
                }}
                onPointerUp={(e) => {
                  if (!start.current || !pages[selected]) return;
                  const end = point(e);
                  const mark: Mark = {
                    kind: mode,
                    ...start.current,
                    x2: end.x,
                    y2: end.y,
                    text,
                    color,
                    size,
                    ...(mode === "draw" || mode === "signature"
                      ? { points: [...stroke.current] }
                      : {}),
                    ...(mode === "image" ? { image: asset } : {}),
                  };
                  update((p) => ({ ...p, marks: [...p.marks, mark] }));
                  start.current = null;
                }}
              />
            </div>
          </div>
          {slug === "pdf-compressor" && (
            <>
              <p className="notice">
                Lossy rasterization removes selectable text, links, forms and
                accessibility tags. Keep your original. Output is not guaranteed
                smaller.
              </p>
              <div className="fields">
                <Field label={`JPEG quality · ${Math.round(quality * 100)}%`}>
                  <input
                    type="range"
                    min=".2"
                    max="1"
                    step=".05"
                    value={quality}
                    onChange={(e) => setQuality(+e.target.value)}
                  />
                </Field>
                <Field label="Resolution (DPI)">
                  <select value={dpi} onChange={(e) => setDpi(+e.target.value)}>
                    {[72, 100, 150, 200].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}
          <div className="toolbar">
            <label className="check">
              <input
                type="checkbox"
                checked={numbering}
                onChange={(e) => setNumbering(e.target.checked)}
              />
              Add page numbers
            </label>
            <button
              className="button"
              disabled={busy}
              onClick={() => exportPdf()}
            >
              Export PDF
            </button>
            {slug === "pdf-splitter" && (
              <>
                <button
                  disabled={busy}
                  onClick={async () => {
                    try {
                      setOutput(await build([pages[selected]]));
                    } catch (e) {
                      setError(message(e));
                    }
                  }}
                >
                  Export selected page
                </button>
                <button disabled={busy} onClick={() => exportPdf(true)}>
                  Split all pages to ZIP
                </button>
              </>
            )}
            <button
              disabled={busy}
              onClick={() => {
                clearPreviews();
                setPages([]);
                setSources([]);
                setSelected(0);
                setOutput(null);
                setStatus("");
              }}
            >
              Reset
            </button>
          </div>
        </>
      )}
      <ErrorAlert error={error} />
      <Status text={status} />
      {output && <DownloadButton blob={output} name="brandique-document.pdf" />}
    </>
  );
}
