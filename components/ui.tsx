"use client";
import {
  useEffect,
  useCallback,
  useId,
  useRef,
  useState,
  cloneElement,
  Children,
  type ReactElement,
} from "react";
import { UploadCloud, ShieldCheck, Download, AlertCircle } from "lucide-react";
import { bytes, safeName, normalizeFile, message } from "@/lib/files";
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
  pasteImages = false,
}: {
  onFiles: (f: File[]) => void | Promise<void>;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  pasteImages?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const picking = useRef(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const blocked = disabled || !ready || reading;
  const receive = useCallback(
    async (files: File[]) => {
      // React may replay a valid selection before the readiness effect commits.
      // Readiness gates the picker UI, never discards an already selected file.
      if (disabled || picking.current || !files.length) return;
      picking.current = true;
      setReading(true);
      setError("");
      try {
        // MIME metadata is frequently absent in mobile/cloud file pickers.
        // Actual image/PDF decoders still validate the untrusted contents.
        await onFiles(
          files.slice(0, multiple ? undefined : 1).map(normalizeFile),
        );
      } catch (e) {
        setError(message(e));
      } finally {
        picking.current = false;
        setReading(false);
      }
    },
    [disabled, multiple, onFiles],
  );
  useEffect(() => {
    if (!pasteImages || blocked) return;
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []).filter(
        (file) => file.type.startsWith("image/"),
      );
      if (!files.length) return;
      event.preventDefault();
      void receive(files);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [pasteImages, blocked, receive]);
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
        void receive(Array.from(e.dataTransfer.files));
      }}
    >
      <UploadCloud size={32} />
      <strong>Drop {multiple ? "your files" : "a file"} here</strong>
      <span>or choose from your device</span>
      <button
        type="button"
        className="button"
        disabled={blocked}
        onClick={() => input.current?.click()}
        aria-controls={id}
      >
        {reading ? "Reading files…" : `Choose ${multiple ? "files" : "file"}`}
      </button>
      <input
        ref={input}
        id={id}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Select ${multiple ? "files" : "file"} from your device`}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={blocked}
        onChange={(e) => {
          if (e.target.files) void receive(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <small>{accept.replaceAll(",", " · ")}</small>
      {pasteImages && <small>Or paste a copied image with Ctrl+V / ⌘V.</small>}
      {reading && (
        <span role="status">Reading your selection on this device…</span>
      )}
      <ErrorAlert error={error} />
      <noscript>
        Enable JavaScript to process files locally in this browser.
      </noscript>
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
    <img
      className="preview"
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  ) : type === "video" ? (
    <video className="preview" src={url} controls />
  ) : (
    <audio src={url} controls />
  );
}
export function DownloadButton({ blob, name }: { blob: Blob; name: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return url ? (
    <a className="button" href={url} download={safeName(name)}>
      <Download size={17} />
      Download · {bytes(blob.size)}
    </a>
  ) : null;
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
