"use client";
import { useState } from "react";
import {
  Field,
  UploadDropzone,
  DownloadButton,
  ErrorAlert,
  Status,
} from "@/components/ui";
import { csvToRecords, recordsToCsv } from "@/lib/calculations";
import { loadPdf, textDocx, textPdf } from "@/lib/documents";
import { message } from "@/lib/files";
export default function DocumentTool({ slug }: { slug: string }) {
  const pdf = slug === "pdf-to-word";
  const [file, setFile] = useState<File | null>(null),
    [format, setFormat] = useState(pdf ? "docx" : "txt"),
    [output, setOutput] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const source = file?.name.split(".").pop()?.toLowerCase() || "txt";
  const options = pdf
    ? ["docx"]
    : source === "json"
      ? ["csv", "txt"]
      : source === "csv"
        ? ["json", "txt"]
        : source === "txt"
          ? ["md", "docx", "pdf"]
          : source === "md"
            ? ["txt", "docx", "pdf"]
            : ["txt", "docx", "pdf"];
  async function run() {
    if (!file) return;
    setBusy(true);
    setOutput(null);
    setError("");
    try {
      let text = "";
      if (pdf) {
        const doc = await loadPdf(await file.arrayBuffer());
        try {
          const pages = [];
          for (let i = 1; i <= doc.numPages; i++) {
            setStatus(`Reading page ${i} of ${doc.numPages}…`);
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            pages.push(
              content.items
                .map((it) =>
                  "str" in it
                    ? it.str + ("hasEOL" in it && it.hasEOL ? "\n" : " ")
                    : "",
                )
                .join(""),
            );
          }
          text = pages.join("\n\n");
          if (!text.trim())
            throw new Error(
              "No selectable text was found. This may be a scanned PDF; local OCR is not included.",
            );
          const { Document, Paragraph, Packer } = await import("docx");
          const outputDoc = new Document({
            sections: pages.map((p) => ({
              children: p.split("\n").map((line) => new Paragraph(line)),
            })),
          });
          setOutput(await Packer.toBlob(outputDoc));
        } finally {
          await doc.destroy();
        }
      } else {
        text = await file.text();
        if (source === "html") {
          const parsed = new DOMParser().parseFromString(text, "text/html");
          parsed
            .querySelectorAll("script,style,iframe,object")
            .forEach((n) => n.remove());
          text = parsed.body.textContent || "";
        }
        if (source === "json" && format === "csv")
          text = recordsToCsv(JSON.parse(text));
        if (source === "csv" && format === "json")
          text = JSON.stringify(csvToRecords(text), null, 2);
        if (format === "docx") setOutput(await textDocx(text));
        else if (format === "pdf") setOutput(await textPdf(text));
        else
          setOutput(
            new Blob([text], {
              type:
                format === "json"
                  ? "application/json"
                  : format === "csv"
                    ? "text/csv"
                    : "text/plain",
            }),
          );
      }
      setPreview(text.slice(0, 10000));
      setStatus("Conversion complete. Preview the extracted content below.");
    } catch (e) {
      setError(message(e));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <UploadDropzone
        accept={pdf ? ".pdf" : ".txt,.md,.html,.json,.csv"}
        disabled={busy}
        onFiles={(f) => {
          const x = f[0];
          setError("");
          setOutput(null);
          setPreview("");
          if (!x) return;
          const ext = x.name.split(".").pop()?.toLowerCase();
          if (
            !(pdf ? ["pdf"] : ["txt", "md", "html", "json", "csv"]).includes(
              ext || "",
            )
          ) {
            setError("This source format is not supported.");
            return;
          }
          if (x.size > 50 * 1024 * 1024) {
            setError(
              "Use a document below 50 MB to keep text parsing responsive.",
            );
            return;
          }
          setFile(x);
          setFormat(
            pdf
              ? "docx"
              : ext === "json"
                ? "csv"
                : ext === "csv"
                  ? "json"
                  : ext === "txt"
                    ? "md"
                    : "txt",
          );
        }}
      />
      {file && (
        <>
          <p className="muted">Selected: {file.name}</p>
          <div className="fields">
            <Field label="Output format">
              <select
                disabled={busy}
                value={options.includes(format) ? format : options[0]}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setOutput(null);
                }}
              >
                {options.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button className="button" disabled={busy} onClick={run}>
            Convert document
          </button>
        </>
      )}
      <ErrorAlert error={error} />
      <Status text={status} />
      {output && (
        <>
          <DownloadButton blob={output} name={"converted." + format} />
          <pre className="code-output">{preview}</pre>
        </>
      )}
    </>
  );
}
