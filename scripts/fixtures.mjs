import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { execFileSync } from "node:child_process";
await mkdir("tests/fixtures", { recursive: true });
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
for (const text of [
  "BrandiQue conversion test",
  "Second page selectable text",
]) {
  const p = pdf.addPage([400, 500]);
  p.drawText(text, { x: 30, y: 440, font, size: 18 });
}
await writeFile("tests/fixtures/sample.pdf", await pdf.save());
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=yellow:s=320x180:d=1",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    "tests/fixtures/sample.mp4",
  ],
  { stdio: "ignore" },
);
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=yellow:s=200x100",
    "-frames:v",
    "1",
    "tests/fixtures/sample.png",
  ],
  { stdio: "ignore" },
);
console.log("Created non-sensitive image, video and PDF fixtures.");
