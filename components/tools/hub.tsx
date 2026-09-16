"use client";
import Link from "next/link";
import { useState } from "react";
import { Field, UploadDropzone, ErrorAlert } from "@/components/ui";
import { message, zipDownload } from "@/lib/files";
const paths = [
  ["JPG / PNG / WebP / AVIF", "JPG / PNG / WebP", "Supported", "image-resizer"],
  [
    "MP4 / MOV / WebM / MKV / AVI",
    "MP4 / WebM",
    "Limited: codec and memory dependent",
    "video-resizer",
  ],
  [
    "Video with audio / MP3 / WAV / OGG",
    "MP3 / WAV / OGG",
    "Limited: decodable audio required",
    "video-to-audio",
  ],
  ["Text-based PDF", "DOCX", "Limited: text and page breaks", "pdf-to-word"],
  [
    "TXT / Markdown / HTML",
    "TXT / DOCX / PDF",
    "Limited: plain text extraction",
    "document-converter",
  ],
  ["JSON array", "CSV", "Supported: flat records", "document-converter"],
  ["CSV", "JSON", "Supported: header row required", "document-converter"],
  ["TXT", "Markdown", "Supported: source text only", "document-converter"],
  ["JPG / PNG / WebP", "PDF", "Supported", "image-to-pdf"],
  [
    "PDF files",
    "Merged / split / annotated PDF",
    "Supported: see editor limitations",
    "pdf-editor",
  ],
];
export default function Hub() {
  const [source, setSource] = useState("All"),
    [files, setFiles] = useState<File[]>([]),
    [error, setError] = useState("");
  return (
    <>
      <Field label="Source format group">
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option>All</option>
          {paths.map((p) => (
            <option key={p[0]}>{p[0]}</option>
          ))}
        </select>
      </Field>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Tool</th>
            </tr>
          </thead>
          <tbody>
            {paths
              .filter((p) => source === "All" || source === p[0])
              .map((p) => (
                <tr key={p[0]}>
                  <td>{p[0]}</td>
                  <td>{p[1]}</td>
                  <td>{p[2]}</td>
                  <td>
                    <Link prefetch={false} href={"/tools/" + p[3] + "/"}>
                      Open converter →
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="notice">
        Unsupported: arbitrary binary formats, executable conversion, DOCX
        layout conversion, scanned PDF OCR, SVG export and AVIF encoding.
        Renaming a file extension does not convert a file. Only the paths listed
        here are implemented.
      </p>
      <h3>Package files into a ZIP</h3>
      <p>
        Archive any local files together. Their contents and formats stay
        unchanged.
      </p>
      <UploadDropzone accept="*" multiple onFiles={setFiles} />
      {files.length > 0 && (
        <div className="toolbar">
          <span>{files.length} files selected</span>
          <button
            className="button"
            onClick={() =>
              zipDownload(files.map((f) => ({ name: f.name, blob: f }))).catch(
                (e) => setError(message(e)),
              )
            }
          >
            Create ZIP
          </button>
        </div>
      )}
      <ErrorAlert error={error} />
    </>
  );
}
