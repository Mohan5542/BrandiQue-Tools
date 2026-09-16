"use client";
import { useState } from "react";
import {
  UploadDropzone,
  BlobPreview,
  Field,
  ErrorAlert,
  DownloadButton,
  Status,
} from "@/components/ui";
import { canvasBlob, message } from "@/lib/files";
export default function ImagePdf() {
  const [files, setFiles] = useState<File[]>([]),
    [format, setFormat] = useState("a4"),
    [margin, setMargin] = useState(24),
    [output, setOutput] = useState<Blob | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    setOutput(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        setStatus(`Adding image ${i + 1} of ${files.length}…`);
        const bmp = await createImageBitmap(files[i]);
        if (bmp.width * bmp.height > 40000000) {
          bmp.close();
          throw new Error("Use images below 40 megapixels.");
        }
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        c.getContext("2d")!.drawImage(bmp, 0, 0);
        bmp.close();
        const image = await pdf.embedPng(
          await (await canvasBlob(c)).arrayBuffer(),
        );
        const size =
          format === "a4"
            ? [595.28, 841.89]
            : format === "letter"
              ? [612, 792]
              : [image.width + margin * 2, image.height + margin * 2];
        const page = pdf.addPage(size as [number, number]);
        const scale = Math.min(
          (size[0] - 2 * margin) / image.width,
          (size[1] - 2 * margin) / image.height,
        );
        if (scale <= 0) throw new Error("Margins are too large for the page.");
        page.drawImage(image, {
          x: (size[0] - image.width * scale) / 2,
          y: (size[1] - image.height * scale) / 2,
          width: image.width * scale,
          height: image.height * scale,
        });
        c.width = 0;
      }
      setOutput(
        new Blob([new Uint8Array(await pdf.save())], {
          type: "application/pdf",
        }),
      );
      setStatus("PDF ready.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <UploadDropzone
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={busy}
        onFiles={(f) => {
          setFiles((p) => [...p, ...f]);
          setOutput(null);
        }}
      />
      <div className="fields">
        <Field label="Page size">
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
            <option value="image">Fit image</option>
          </select>
        </Field>
        <Field label="Margin (points)">
          <input
            type="number"
            min="0"
            max="200"
            value={margin}
            onChange={(e) =>
              setMargin(Math.max(0, Math.min(200, +e.target.value)))
            }
          />
        </Field>
      </div>
      {files.map((f, i) => (
        <div key={i} className="file-row">
          <strong>
            {i + 1}. {f.name}
          </strong>
          <BlobPreview blob={f} />
          <div className="toolbar">
            <button
              disabled={busy || !i}
              onClick={() => {
                const a = [...files];
                [a[i - 1], a[i]] = [a[i], a[i - 1]];
                setFiles(a);
                setOutput(null);
              }}
            >
              Move up
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setFiles((p) => p.filter((_, j) => i !== j));
                setOutput(null);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="toolbar">
        <button
          className="button"
          disabled={busy || !files.length}
          onClick={run}
        >
          Create PDF
        </button>
      </div>
      <ErrorAlert error={error} />
      <Status text={status} />
      {output && <DownloadButton blob={output} name="images.pdf" />}
    </>
  );
}
