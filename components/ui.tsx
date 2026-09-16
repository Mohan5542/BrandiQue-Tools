"use client";
import {
  useEffect,
  useId,
  useState,
  cloneElement,
  Children,
  type ReactElement,
} from "react";
import { UploadCloud, ShieldCheck, Download, AlertCircle } from "lucide-react";
import { bytes, download } from "@/lib/files";
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(Children.only(children) as ReactElement<{ id: string }>, {
        id,
      })}
    </div>
  );
}
export function ErrorAlert({ error }: { error: string }) {
  return error ? (
    <div role="alert" className="error">
      <AlertCircle size={18} />
      {error}
    </div>
  ) : null;
}
export function PrivacyBadge() {
  return (
    <span className="privacy-badge">
      <ShieldCheck size={15} /> Your files stay on your device
    </span>
  );
}
export function AdSlot({ position = "content" }: { position?: string }) {
  return (
    <aside
      className="ad-slot"
      aria-label="Reserved advertising space"
      data-ad-slot={position}
    >
      <span>Advertisement space</span>
    </aside>
  );
}
export function UploadDropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
}: {
  onFiles: (f: File[]) => void;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const [drag, setDrag] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const blocked = disabled || !ready;
  return (
    <div
      className={`dropzone ${drag ? "drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!blocked) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!blocked)
          onFiles(
            Array.from(e.dataTransfer.files).slice(0, multiple ? undefined : 1),
          );
      }}
    >
      <UploadCloud size={32} />
      <strong>Drop {multiple ? "your files" : "a file"} here</strong>
      <span>or choose from your device</span>
      <label className={`button ${blocked ? "disabled" : ""}`} htmlFor={id}>
        Choose {multiple ? "files" : "file"}
      </label>
      <input
        id={id}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={blocked}
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <small>{accept.replaceAll(",", " · ")}</small>
    </div>
  );
}
export function BlobPreview({
  blob,
  type = "image",
  alt = "Processed output",
}: {
  blob: Blob;
  type?: "image" | "video" | "audio";
  alt?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  return type === "image" ? (
    <img className="preview" src={url} alt={alt} />
  ) : type === "video" ? (
    <video className="preview" src={url} controls />
  ) : (
    <audio src={url} controls />
  );
}
export function DownloadButton({ blob, name }: { blob: Blob; name: string }) {
  return (
    <button className="button" onClick={() => download(blob, name)}>
      <Download size={17} />
      Download · {bytes(blob.size)}
    </button>
  );
}
export function Status({
  text,
  progress,
}: {
  text: string;
  progress?: number;
}) {
  return (
    <div className="status" role="status" aria-live="polite">
      {text}
      {progress !== undefined && <progress max={100} value={progress} />}
    </div>
  );
}
