"use client";
import { useEffect, useRef, useState } from "react";
import {
  UploadDropzone,
  Field,
  ErrorAlert,
  DownloadButton,
} from "@/components/ui";
import { canvasBlob, message } from "@/lib/files";
export default function Screenshot() {
  const canvas = useRef<HTMLCanvasElement>(null),
    start = useRef<{ x: number; y: number } | null>(null),
    history = useRef<ImageData[]>([]),
    loaded = useRef(false);
  const [hasImage, setHasImage] = useState(false),
    [mode, setMode] = useState("arrow"),
    [color, setColor] = useState("#fbff00"),
    [size, setSize] = useState(4),
    [text, setText] = useState("Annotation"),
    [width, setWidth] = useState(1200),
    [height, setHeight] = useState(800),
    [padding, setPadding] = useState(32),
    [background, setBackground] = useState("#181818"),
    [radius, setRadius] = useState(12),
    [shadow, setShadow] = useState(true),
    [type, setType] = useState("image/png"),
    [output, setOutput] = useState<Blob | null>(null),
    [error, setError] = useState("");
  function checkpoint() {
    const c = canvas.current!;
    if (c.width * c.height > 16000000) {
      history.current = [];
      return;
    }
    history.current.push(
      c.getContext("2d")!.getImageData(0, 0, c.width, c.height),
    );
    if (history.current.length > 8) history.current.shift();
    setOutput(null);
  }
  async function load(files: File[]) {
    try {
      setError("");
      const f = files[0];
      if (!f) return;
      if (!/^image\/(png|jpeg|webp)$/.test(f.type))
        throw new Error("Choose a PNG, JPG or WebP screenshot.");
      const bmp = await createImageBitmap(f);
      if (bmp.width * bmp.height > 24000000) {
        bmp.close();
        throw new Error("Use an image below 24 megapixels.");
      }
      const c = canvas.current!;
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext("2d")!.drawImage(bmp, 0, 0);
      setWidth(bmp.width);
      setHeight(bmp.height);
      bmp.close();
      history.current = [];
      loaded.current = true;
      setHasImage(true);
      setOutput(null);
    } catch (e) {
      setError(message(e));
    }
  }
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) {
        e.preventDefault();
        void load(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget,
      r = c.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(c.width, ((e.clientX - r.left) * c.width) / r.width),
      ),
      y: Math.max(
        0,
        Math.min(c.height, ((e.clientY - r.top) * c.height) / r.height),
      ),
    };
  }
  function finish(e: React.PointerEvent<HTMLCanvasElement>) {
    const a = start.current;
    if (!a) return;
    const b = point(e),
      c = canvas.current!,
      ctx = c.getContext("2d")!;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    const x = Math.min(a.x, b.x),
      y = Math.min(a.y, b.y),
      w = Math.abs(a.x - b.x),
      h = Math.abs(a.y - b.y);
    if (mode === "text") {
      ctx.font = `${Math.max(12, size * 5)}px Arial`;
      ctx.fillText(text, a.x, a.y);
    } else if (mode === "crop" && w > 1 && h > 1) {
      const data = ctx.getImageData(x, y, w, h);
      c.width = Math.round(w);
      c.height = Math.round(h);
      ctx.putImageData(data, 0, 0);
      setWidth(c.width);
      setHeight(c.height);
    } else if ((mode === "blur" || mode === "pixelate") && w > 1 && h > 1) {
      const tmp = document.createElement("canvas");
      tmp.width = mode === "pixelate" ? Math.max(1, Math.round(w / 15)) : w;
      tmp.height = mode === "pixelate" ? Math.max(1, Math.round(h / 15)) : h;
      tmp
        .getContext("2d")!
        .drawImage(c, x, y, w, h, 0, 0, tmp.width, tmp.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.imageSmoothingEnabled = mode !== "pixelate";
      if (mode === "blur") ctx.filter = "blur(12px)";
      ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
      ctx.restore();
      tmp.width = 0;
    } else if (mode === "rectangle") ctx.strokeRect(x, y, w, h);
    else if (mode === "solid rectangle") ctx.fillRect(x, y, w, h);
    else if (mode === "highlight") {
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    } else if (mode === "circle") {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (mode === "arrow") {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x),
        head = Math.max(15, size * 4);
      ctx.moveTo(
        b.x - head * Math.cos(angle - 0.5),
        b.y - head * Math.sin(angle - 0.5),
      );
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(
        b.x - head * Math.cos(angle + 0.5),
        b.y - head * Math.sin(angle + 0.5),
      );
      ctx.stroke();
    }
    start.current = null;
    setOutput(null);
  }
  function transform(rotate = false) {
    const c = canvas.current!;
    if (
      !rotate &&
      (!Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 1 ||
        height < 1 ||
        width * height > 24000000)
    ) {
      setError("Use positive whole dimensions under 24 megapixels.");
      return;
    }
    checkpoint();
    const tmp = document.createElement("canvas");
    tmp.width = c.width;
    tmp.height = c.height;
    tmp.getContext("2d")!.drawImage(c, 0, 0);
    c.width = rotate ? tmp.height : width;
    c.height = rotate ? tmp.width : height;
    const ctx = c.getContext("2d")!;
    if (rotate) {
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(tmp, -tmp.width / 2, -tmp.height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else ctx.drawImage(tmp, 0, 0, c.width, c.height);
    setWidth(c.width);
    setHeight(c.height);
    tmp.width = 0;
  }
  async function exportImage() {
    try {
      const c = canvas.current!,
        out = document.createElement("canvas");
      out.width = c.width + padding * 2;
      out.height = c.height + padding * 2;
      if (out.width * out.height > 30000000)
        throw new Error("Reduce padding or image dimensions before exporting.");
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.save();
      if (shadow) {
        ctx.shadowColor = "#0009";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;
      }
      ctx.fillStyle = background;
      ctx.beginPath();
      ctx.roundRect(padding, padding, c.width, c.height, radius);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.roundRect(padding, padding, c.width, c.height, radius);
      ctx.clip();
      ctx.drawImage(c, padding, padding);
      const blob = await canvasBlob(out, type, 0.92);
      if (blob.type !== type)
        throw new Error("This output format is not supported in your browser.");
      setOutput(blob);
      out.width = 0;
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <>
      <UploadDropzone accept="image/png,image/jpeg,image/webp" onFiles={load} />
      <p className="muted">You can also paste a screenshot with Ctrl+V / ⌘V.</p>
      <div className={hasImage ? "editor-layout" : ""}>
        <div className="editor-controls" hidden={!hasImage}>
          {hasImage && (
            <>
              <Field label="Tool">
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  {[
                    "arrow",
                    "text",
                    "draw",
                    "rectangle",
                    "solid rectangle",
                    "circle",
                    "highlight",
                    "crop",
                    "blur",
                    "pixelate",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Annotation text">
                <input value={text} onChange={(e) => setText(e.target.value)} />
              </Field>
              <Field label="Color">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </Field>
              <Field label="Stroke width / text scale">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={size}
                  onChange={(e) =>
                    setSize(Math.max(1, Math.min(30, +e.target.value)))
                  }
                />
              </Field>
              <Field label="Width">
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(+e.target.value)}
                />
              </Field>
              <Field label="Height">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(+e.target.value)}
                />
              </Field>
              <div className="toolbar">
                <button onClick={() => transform()}>Resize</button>
                <button onClick={() => transform(true)}>Rotate</button>
                <button
                  onClick={() => {
                    const d = history.current.pop();
                    if (d) {
                      const c = canvas.current!;
                      c.width = d.width;
                      c.height = d.height;
                      c.getContext("2d")!.putImageData(d, 0, 0);
                      setWidth(d.width);
                      setHeight(d.height);
                      setOutput(null);
                    }
                  }}
                >
                  Undo
                </button>
              </div>
              <Field label="Export padding (px)">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={padding}
                  onChange={(e) => {
                    setPadding(Math.max(0, Math.min(300, +e.target.value)));
                    setOutput(null);
                  }}
                />
              </Field>
              <Field label="Background">
                <input
                  type="color"
                  value={background}
                  onChange={(e) => {
                    setBackground(e.target.value);
                    setOutput(null);
                  }}
                />
              </Field>
              <Field label="Corner radius">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={radius}
                  onChange={(e) => {
                    setRadius(Math.max(0, Math.min(200, +e.target.value)));
                    setOutput(null);
                  }}
                />
              </Field>
              <label className="check">
                <input
                  type="checkbox"
                  checked={shadow}
                  onChange={(e) => {
                    setShadow(e.target.checked);
                    setOutput(null);
                  }}
                />
                Drop shadow
              </label>
              <Field label="Output">
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setOutput(null);
                  }}
                >
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </Field>
              <button className="button" onClick={exportImage}>
                Export screenshot
              </button>
            </>
          )}
        </div>
        <div className="canvas-wrap" hidden={!hasImage}>
          <canvas
            ref={canvas}
            aria-label="Screenshot editing canvas; drag to apply the selected tool"
            onPointerDown={(e) => {
              if (!loaded.current) return;
              checkpoint();
              e.currentTarget.setPointerCapture(e.pointerId);
              start.current = point(e);
              const ctx = e.currentTarget.getContext("2d")!;
              ctx.beginPath();
              ctx.moveTo(start.current.x, start.current.y);
            }}
            onPointerMove={(e) => {
              if (start.current && mode === "draw") {
                const p = point(e),
                  ctx = e.currentTarget.getContext("2d")!;
                ctx.strokeStyle = color;
                ctx.lineWidth = size;
                ctx.lineCap = "round";
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
              }
            }}
            onPointerUp={finish}
          />
        </div>
      </div>
      {hasImage && (
        <p className="notice">
          Click to add text; drag for shapes and selected regions. For sensitive
          information, use a solid opaque rectangle and inspect the exported
          image. Undo retains up to 8 recent edits on images below 16
          megapixels.
        </p>
      )}
      <ErrorAlert error={error} />
      {output && (
        <DownloadButton
          blob={output}
          name={
            "screenshot." + (type === "image/jpeg" ? "jpg" : type.split("/")[1])
          }
        />
      )}
    </>
  );
}
