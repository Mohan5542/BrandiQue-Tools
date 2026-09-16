"use client";
import { useState } from "react";
import { Field, ErrorAlert, DownloadButton } from "@/components/ui";
import { download, message } from "@/lib/files";
export default function Utility({ slug }: { slug: string }) {
  const [input, setInput] = useState(
      slug === "color-converter" ? "#FBFF00" : "",
    ),
    [output, setOutput] = useState(""),
    [error, setError] = useState(""),
    [length, setLength] = useState(20),
    [symbols, setSymbols] = useState(true),
    [qr, setQr] = useState<Blob | null>(null),
    [mode, setMode] = useState("seconds");
  const words = input.trim() ? input.trim().split(/\s+/u).length : 0;
  async function run(action: string) {
    setError("");
    setOutput("");
    try {
      if (slug === "json-formatter" || slug === "json-validator") {
        const parsed = JSON.parse(input);
        setOutput(
          slug === "json-validator"
            ? "Valid JSON. Syntax check passed."
            : JSON.stringify(parsed, null, action === "Minify" ? 0 : 2),
        );
      } else if (slug === "base64-encoder-decoder") {
        if (action === "Encode") {
          const data = new TextEncoder().encode(input);
          let binary = "";
          for (const b of data) binary += String.fromCharCode(b);
          setOutput(btoa(binary));
        } else
          setOutput(
            new TextDecoder("utf-8", { fatal: true }).decode(
              Uint8Array.from(atob(input.replace(/\s/g, "")), (c) =>
                c.charCodeAt(0),
              ),
            ),
          );
      } else if (slug === "url-encoder-decoder")
        setOutput(
          action === "Encode"
            ? encodeURIComponent(input)
            : decodeURIComponent(input),
        );
      else if (slug === "case-converter")
        setOutput(
          action === "UPPERCASE"
            ? input.toUpperCase()
            : action === "lowercase"
              ? input.toLowerCase()
              : action === "Title Case"
                ? input
                    .toLowerCase()
                    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
                : input
                    .toLowerCase()
                    .replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (c) =>
                      c.toUpperCase(),
                    ),
        );
      else if (slug === "text-cleaner")
        setOutput(
          input
            .split(/\r?\n/)
            .map((l) => l.trim().replace(/[\t ]+/g, " "))
            .filter(Boolean)
            .join("\n"),
        );
      else if (slug === "password-generator") {
        if (!Number.isInteger(length) || length < 8 || length > 128)
          throw new Error("Choose a length between 8 and 128.");
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
          (symbols ? "!@#$%^&*()-_=+[]{}:,.?" : "");
        let result = "";
        const max = 256 - (256 % chars.length);
        while (result.length < length) {
          const values = crypto.getRandomValues(new Uint8Array(128));
          for (const v of values)
            if (v < max && result.length < length)
              result += chars[v % chars.length];
        }
        setOutput(result);
      } else if (slug === "color-converter") {
        if (!/^#[0-9a-f]{6}$/i.test(input))
          throw new Error("Enter a six-digit HEX color, for example #FBFF00.");
        const rgb = [1, 3, 5].map((i) => parseInt(input.slice(i, i + 2), 16)),
          [r, g, b] = rgb.map((n) => n / 255),
          max = Math.max(r, g, b),
          min = Math.min(r, g, b),
          d = max - min,
          l = (max + min) / 2,
          s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        let h =
          d === 0
            ? 0
            : max === r
              ? ((g - b) / d) % 6
              : max === g
                ? (b - r) / d + 2
                : (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
        setOutput(
          `${input.toUpperCase()}\nrgb(${rgb.join(", ")})\nhsl(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`,
        );
      } else if (slug === "timestamp-converter") {
        if (!input.trim()) throw new Error("Enter a timestamp or date.");
        const date =
          action === "Date to timestamp"
            ? new Date(input)
            : new Date(Number(input) * (mode === "seconds" ? 1000 : 1));
        if (!Number.isFinite(+date))
          throw new Error(
            "Enter a valid date with timezone or numeric timestamp.",
          );
        setOutput(
          `Unix seconds: ${Math.floor(+date / 1000)}\nUnix milliseconds: ${+date}\nUTC: ${date.toISOString()}\nLocal: ${date.toString()}`,
        );
      } else if (slug === "qr-code-generator") {
        if (!input.trim()) throw new Error("Enter text or a URL first.");
        const QRCode = await import("qrcode");
        const c = document.createElement("canvas");
        await QRCode.toCanvas(c, input, {
          width: 512,
          margin: 4,
          errorCorrectionLevel: "M",
        });
        const blob = await new Promise<Blob>((res, rej) =>
          c.toBlob((b) => (b ? res(b) : rej(new Error("QR export failed.")))),
        );
        setQr(blob);
        setOutput("QR code ready. Test it before printing.");
      }
    } catch (e) {
      setError(message(e));
    }
  }
  const actions =
    slug === "json-formatter"
      ? ["Format", "Minify"]
      : slug === "json-validator"
        ? ["Validate"]
        : slug.includes("encoder-decoder")
          ? ["Encode", "Decode"]
          : slug === "case-converter"
            ? ["UPPERCASE", "lowercase", "Title Case", "Sentence case"]
            : slug === "timestamp-converter"
              ? ["Timestamp to date", "Date to timestamp"]
              : ["Generate"];
  return (
    <>
      {slug === "password-generator" ? (
        <div className="fields">
          <Field label="Password length">
            <input
              type="number"
              min="8"
              max="128"
              value={length}
              onChange={(e) => setLength(+e.target.value)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={symbols}
              onChange={(e) => setSymbols(e.target.checked)}
            />
            Include symbols
          </label>
        </div>
      ) : (
        <Field
          label={
            slug === "color-converter"
              ? "HEX color"
              : slug === "timestamp-converter"
                ? "Unix timestamp or ISO date (include timezone)"
                : "Your input"
          }
        >
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOutput("");
              setQr(null);
            }}
            spellCheck={false}
          />
        </Field>
      )}
      {slug === "color-converter" && /^#[0-9a-f]{6}$/i.test(input) && (
        <div
          style={{
            height: 70,
            background: input,
            borderRadius: 8,
            marginTop: 15,
          }}
          aria-label={`Color preview ${input}`}
        />
      )}
      {slug === "timestamp-converter" && (
        <Field label="Input timestamp unit">
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option>seconds</option>
            <option>milliseconds</option>
          </select>
        </Field>
      )}
      {slug === "word-counter" ? (
        <div className="stats-grid">
          {[
            ["Words", words],
            ["Characters", Array.from(input).length],
            ["Without whitespace", Array.from(input.replace(/\s/g, "")).length],
            ["Lines", input ? input.split("\n").length : 0],
            [
              "Sentences (estimate)",
              input.trim()
                ? input.split(/[.!?]+/).filter((x) => x.trim()).length
                : 0,
            ],
            ["Reading minutes (200 words/min)", Math.ceil(words / 200)],
          ].map(([label, n]) => (
            <div className="stat" key={String(label)}>
              <span>{label}</span>
              <strong>{n}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="toolbar">
          {actions.map((action) => (
            <button className="button" key={action} onClick={() => run(action)}>
              {action}
            </button>
          ))}
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setQr(null);
              setError("");
            }}
          >
            Clear
          </button>
        </div>
      )}
      <ErrorAlert error={error} />
      {output && (
        <>
          <pre className="code-output" role="status">
            {output}
          </pre>
          <div className="toolbar">
            <button
              onClick={async () => {
                try {
                  if (!navigator.clipboard)
                    throw new Error("Clipboard unavailable");
                  await navigator.clipboard.writeText(output);
                  setError("");
                } catch {
                  setError(
                    "Clipboard access is unavailable. Select and copy the result manually.",
                  );
                }
              }}
            >
              Copy result
            </button>
            {slug !== "password-generator" && (
              <button
                onClick={() =>
                  download(
                    new Blob([output], { type: "text/plain" }),
                    "result." + (slug === "json-formatter" ? "json" : "txt"),
                  )
                }
              >
                Download text
              </button>
            )}
          </div>
        </>
      )}
      {qr && (
        <>
          <QrPreview blob={qr} />
          <DownloadButton blob={qr} name="qr-code.png" />
        </>
      )}
    </>
  );
}
import { BlobPreview } from "@/components/ui";
function QrPreview({ blob }: { blob: Blob }) {
  return <BlobPreview blob={blob} alt="Generated QR code" />;
}
