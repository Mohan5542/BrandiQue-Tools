import { mkdir, copyFile, cp } from "node:fs/promises";
await mkdir("public/vendor", { recursive: true });
for (const [from, to] of [
  ["node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js", "ffmpeg-core.js"],
  ["node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm", "ffmpeg-core.wasm"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
])
  await copyFile(from, "public/vendor/" + to);
console.log("Local processing assets prepared.");

await copyFile(
  "node_modules/pdfjs-dist/LICENSE",
  "public/vendor/PDFJS-LICENSE",
);
for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"])
  await cp("node_modules/pdfjs-dist/" + folder, "public/vendor/pdf-" + folder, {
    recursive: true,
  });
await copyFile("licenses/GPL-2.0.txt", "public/vendor/FFMPEG-GPL-2.0.txt");
await copyFile("THIRD_PARTY.md", "public/vendor/THIRD_PARTY.txt");
