"use client";
import { useEffect, useRef, useState } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { videoArgs } from "@/lib/video";
import { bytes, message } from "@/lib/files";
import {
  BlobPreview,
  DownloadButton,
  ErrorAlert,
  Field,
  Status,
  UploadDropzone,
} from "@/components/ui";
export default function VideoTool({ slug }: { slug: string }) {
  const audioOnly = slug === "video-to-audio";
  const [file, setFile] = useState<File | null>(null),
    [output, setOutput] = useState<Blob | null>(null),
    [format, setFormat] = useState(audioOnly ? "mp3" : "mp4"),
    [w, setW] = useState(1280),
    [h, setH] = useState(720),
    [ratio, setRatio] = useState(16 / 9),
    [lock, setLock] = useState(true),
    [fit, setFit] = useState("contain"),
    [quality, setQuality] = useState(28),
    [bitrate, setBitrate] = useState(0),
    [fps, setFps] = useState(0),
    [audio, setAudio] = useState(true),
    [audioBitrate, setAudioBitrate] = useState(128),
    [busy, setBusy] = useState(false),
    [metadataBusy, setMetadataBusy] = useState(false),
    [status, setStatus] = useState(""),
    [progress, setProgress] = useState<number | undefined>(),
    [error, setError] = useState(""),
    [duration, setDuration] = useState(0),
    [original, setOriginal] = useState({ w: 1280, h: 720 }),
    [scale, setScale] = useState(100);
  const engine = useRef<FFmpeg | null>(null),
    cancelled = useRef(false);
  const metadataCleanup = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      cancelled.current = true;
      metadataCleanup.current?.();
      engine.current?.terminate();
    },
    [],
  );
  function choose(files: File[]) {
    const f = files[0];
    if (!f) return;
    metadataCleanup.current?.();
    setMetadataBusy(false);
    setFile(null);
    setOutput(null);
    setError("");
    setStatus("");
    if (!/\.(mp4|webm|mov|mkv|avi|m4v|ogg|mp3|wav)$/i.test(f.name)) {
      setError(
        "Choose a supported video or audio container such as MP4, WebM or MOV.",
      );
      return;
    }
    if (f.size > 512 * 1024 * 1024) {
      setError(
        "This file exceeds the 512 MB safety budget of this in-memory engine. Trim it locally first. The engine needs several times the input size in memory.",
      );
      return;
    }
    metadataCleanup.current?.();
    setFile(f);
    setMetadataBusy(true);
    setStatus(
      "Reading video metadata… Preview and controls will be ready shortly.",
    );
    const url = URL.createObjectURL(f);
    const v = document.createElement("video");
    let settled = false;
    const cleanup = () => {
      settled = true;
      clearTimeout(timer);
      v.onloadedmetadata = null;
      v.onerror = null;
      v.removeAttribute("src");
      v.load();
      URL.revokeObjectURL(url);
    };
    const finish = (supported: boolean) => {
      if (settled) return;
      const width = supported ? v.videoWidth || 1280 : 1280;
      const height = supported ? v.videoHeight || 720 : 720;
      const seconds = supported && Number.isFinite(v.duration) ? v.duration : 0;
      cleanup();
      metadataCleanup.current = null;
      setMetadataBusy(false);
      setW(width);
      setH(height);
      setOriginal({ w: width, h: height });
      setRatio(width / height);
      setDuration(seconds);
      setScale(100);
      setFile(f);
      setStatus(
        supported
          ? ""
          : "Browser preview is unavailable. The local FFmpeg engine may still decode this file.",
      );
    };
    const timer = setTimeout(() => finish(false), 10000);
    metadataCleanup.current = cleanup;
    v.preload = "metadata";
    v.onloadedmetadata = () => finish(true);
    v.onerror = () => finish(false);
    v.src = url;
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setOutput(null);
    setError("");
    setProgress(undefined);
    cancelled.current = false;
    try {
      if (
        bitrate < 0 ||
        fps < 0 ||
        fps > 120 ||
        audioBitrate < 32 ||
        audioBitrate > 320
      )
        throw new Error(
          "Check bitrate, frame rate (0–120), and audio bitrate (32–320 kbps).",
        );
      videoArgs("input", "output", {
        audioOnly,
        format,
        width: w,
        height: h,
        fit,
        quality,
        bitrate,
        fps,
        audio,
        audioBitrate,
      });
      setStatus("Loading the local video engine (about 32 MB on first use)…");
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      if (cancelled.current) return;
      const ff = engine.current || new FFmpeg();
      const fresh = !engine.current;
      engine.current = ff;
      if (fresh)
        ff.on("progress", ({ progress: p }) => {
          if (!cancelled.current) {
            setProgress(Math.max(0, Math.min(99, Math.round(p * 100))));
            setStatus("Processing on your device…");
          }
        });
      if (!ff.loaded) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            ff.load({
              coreURL: "/vendor/ffmpeg-core.js",
              wasmURL: "/vendor/ffmpeg-core.wasm",
            }),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => {
                reject(
                  new Error(
                    "The video engine could not load. Check your connection and retry. The host must serve the /vendor/ engine files.",
                  ),
                );
                ff.terminate();
              }, 90000);
            }),
          ]);
        } finally {
          clearTimeout(timeout);
        }
      }
      setStatus("Preparing your video on this device…");
      if (cancelled.current) return;
      const input =
        "input." +
        (file.name
          .split(".")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "") || "mp4");
      await ff.writeFile(input, new Uint8Array(await file.arrayBuffer()));
      const out = "output." + format;
      const code = await ff.exec(
        videoArgs(input, out, {
          audioOnly,
          format,
          width: w,
          height: h,
          fit,
          quality,
          bitrate,
          fps,
          audio,
          audioBitrate,
        }),
      );
      if (code !== 0)
        throw new Error(
          "Conversion failed. The file may be damaged, have no audio track, use an unsupported codec, or exceed browser memory. Try a smaller source or MP4 output.",
        );
      const data = await ff.readFile(out);
      if (typeof data === "string" || data.length < 32)
        throw new Error("The conversion produced no valid output.");
      const mime = audioOnly
        ? { mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg" }[format]
        : `video/${format}`;
      setOutput(new Blob([new Uint8Array(data)], { type: mime }));
      await ff.deleteFile(input);
      await ff.deleteFile(out);
      setProgress(100);
      setStatus("Conversion complete. Preview and download your file.");
    } catch (e) {
      if (!cancelled.current) {
        setError(message(e));
        setStatus("Processing stopped.");
        setProgress(undefined);
      }
      // Keep the initialized worker for the next conversion on this tool.
    } finally {
      if (engine.current && !engine.current.loaded) {
        engine.current.terminate();
        engine.current = null;
      }
      if (engine.current?.loaded) {
        try {
          const entries = await engine.current.listDir("/");
          for (const entry of entries)
            if (!entry.isDir && /^(input|output)\./.test(entry.name))
              await engine.current.deleteFile(entry.name);
        } catch {
          /* Cancellation can terminate the worker during cleanup. */
        }
      }
      setBusy(false);
    }
  }
  function cancel() {
    cancelled.current = true;
    engine.current?.terminate();
    engine.current = null;
    setStatus("Cancelled. No output was saved.");
    setProgress(undefined);
  }
  return (
    <>
      <UploadDropzone
        accept="video/*,.mkv,.avi,.mov,audio/*"
        onFiles={choose}
        disabled={busy}
      />
      <p className="notice">
        Runs entirely on your device. The video engine loads only when you press
        Convert. Start with a short clip, especially on phones. Keep this tab
        open while processing.
      </p>
      {file && (
        <>
          <div className="file-info">
            <div>
              <strong>{file.name}</strong>
              <small>
                {bytes(file.size)} ·{" "}
                {duration
                  ? duration.toFixed(1) + " seconds"
                  : "Duration unavailable"}
              </small>
            </div>
          </div>
          <BlobPreview blob={file} type="video" />
          <fieldset className="fields" disabled={busy || metadataBusy}>
            <Field label="Output format">
              <select
                value={format}
                disabled={busy}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setOutput(null);
                }}
              >
                {(audioOnly ? ["mp3", "wav", "ogg"] : ["mp4", "webm"]).map(
                  (f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()}
                      {f === "mp4" ? " · H.264" : f === "webm" ? " · VP8" : ""}
                    </option>
                  ),
                )}
              </select>
            </Field>
            {!audioOnly && (
              <>
                <Field label="Width (px)">
                  <input
                    type="number"
                    value={w}
                    onChange={(e) => {
                      setW(+e.target.value);
                      if (lock) setH(Math.round(+e.target.value / ratio));
                    }}
                  />
                </Field>
                <Field label="Height (px)">
                  <input
                    type="number"
                    disabled={lock}
                    value={h}
                    onChange={(e) => setH(+e.target.value)}
                  />
                </Field>
                <Field label="Resolution preset">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const width = +e.target.value;
                      if (width) {
                        setW(width);
                        setH(Math.round(width / ratio));
                      }
                    }}
                  >
                    <option value="">Custom</option>
                    <option value="1920">1080p width · 1920</option>
                    <option value="1280">720p width · 1280</option>
                    <option value="854">480p width · 854</option>
                    <option value="640">Small · 640</option>
                  </select>
                </Field>
                <Field label="Scale original (%)">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={scale}
                    onChange={(e) => {
                      const n = +e.target.value;
                      setScale(n);
                      setW(Math.round((original.w * n) / 100));
                      setH(Math.round((original.h * n) / 100));
                    }}
                  />
                </Field>
                <Field label="Fit">
                  <select value={fit} onChange={(e) => setFit(e.target.value)}>
                    <option value="contain">Contain with padding</option>
                    <option value="cover">Cover with crop</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </Field>
                <Field label={`Quality (CRF ${quality}; lower = better)`}>
                  <input
                    type="range"
                    min="18"
                    max="40"
                    value={quality}
                    onChange={(e) => setQuality(+e.target.value)}
                  />
                </Field>
                <Field label="Video bitrate kbps (0 = CRF)">
                  <input
                    type="number"
                    min="0"
                    value={bitrate}
                    onChange={(e) => setBitrate(+e.target.value)}
                  />
                </Field>
                <Field label="Frames / second">
                  <select value={fps} onChange={(e) => setFps(+e.target.value)}>
                    {[0, 15, 24, 25, 30, 60].map((n) => (
                      <option key={n} value={n}>
                        {n || "Keep original"}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            <Field label="Audio bitrate (kbps)">
              <select
                value={audioBitrate}
                disabled={format === "wav"}
                onChange={(e) => setAudioBitrate(+e.target.value)}
              >
                {[64, 96, 128, 192, 256, 320].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
          </fieldset>
          {!audioOnly && (
            <div className="toolbar">
              <label className="check">
                <input
                  type="checkbox"
                  checked={lock}
                  onChange={(e) => setLock(e.target.checked)}
                />
                Lock aspect ratio
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={audio}
                  onChange={(e) => setAudio(e.target.checked)}
                />
                Keep audio
              </label>
              <button
                onClick={() => {
                  setQuality(32);
                  setW(854);
                  setH(Math.round(854 / ratio));
                  setFps(24);
                  setAudioBitrate(96);
                  setBitrate(0);
                }}
              >
                Smaller file preset
              </button>
              <button
                onClick={() => {
                  setQuality(23);
                  setW(original.w);
                  setH(original.h);
                  setFps(0);
                  setAudioBitrate(192);
                  setBitrate(0);
                }}
              >
                Higher quality preset
              </button>
            </div>
          )}
          {bitrate > 0 && duration > 0 && (
            <p className="muted">
              Approximate size from chosen bitrate:{" "}
              {bytes(
                (((bitrate + (audio ? audioBitrate : 0)) * 1000) / 8) *
                  duration,
              )}
              . Actual size varies.
            </p>
          )}
          <div className="toolbar">
            <button
              className="button"
              disabled={busy || metadataBusy}
              onClick={run}
            >
              {audioOnly ? "Extract audio" : "Convert video"}
            </button>
            {busy && <button onClick={cancel}>Cancel processing</button>}
            <button
              disabled={busy}
              onClick={() => {
                metadataCleanup.current?.();
                setMetadataBusy(false);
                engine.current?.terminate();
                engine.current = null;
                setFile(null);
                setOutput(null);
                setStatus("");
                setError("");
              }}
            >
              Reset
            </button>
          </div>
        </>
      )}
      <ErrorAlert error={error} />
      <Status text={status} progress={progress} />
      {output && file && (
        <div className="result-box">
          <h3>Your file is ready</h3>
          <BlobPreview blob={output} type={audioOnly ? "audio" : "video"} />
          <p>
            {bytes(file.size)} → {bytes(output.size)} (
            {((1 - output.size / file.size) * 100).toFixed(1)}% smaller)
          </p>
          <DownloadButton blob={output} name={"brandique-output." + format} />
        </div>
      )}
    </>
  );
}
