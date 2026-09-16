# Third-party components

The lockfile is the authoritative version inventory. Application source is MIT licensed. Third-party components retain their own licenses.

| Component | Purpose | License |
| --- | --- | --- |
| Next.js / React | Static routes and interactive UI | MIT |
| Lucide | Interface icons | ISC |
| pdf-lib | PDF creation and page operations | MIT |
| PDF.js | Local PDF rendering and text extraction | Apache-2.0 |
| docx | Word document generation | MIT |
| JSZip | Local ZIP generation | MIT or GPL-3.0-or-later (MIT option used) |
| qrcode | QR generation | MIT |
| @ffmpeg/ffmpeg | Browser worker wrapper | MIT |
| @ffmpeg/core 0.12.10 | FFmpeg/WASM multimedia engine | GPL-2.0-or-later, with component-specific terms |

## FFmpeg engine

The optional video engine is a separately downloaded asset, not part of the homepage's JavaScript. Its GPL license is not replaced by this project's MIT license. Preserve upstream notices and provide the corresponding engine source/build configuration when redistributing the compiled engine. Upstream source and reproducible build definitions: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10 . Core packaging: https://www.npmjs.com/package/@ffmpeg/core/v/0.12.10 . The engine contains codec libraries with their own notices; review upstream build configuration before distributing a customized core.

The asset preparation script copies PDF.js's license alongside its worker. All dependency license files remain available under node_modules after npm ci. Run a license review again when changing dependencies or media engine builds.

## Why these dependencies

Canvas / File / Blob / Web Crypto APIs handle basic tools without a library. FFmpeg is needed for real non-realtime video conversion and runs in its own worker. PDF.js handles parsing/rendering; pdf-lib handles output. docx produces valid Office Open XML, JSZip packages output, and qrcode provides a mature encoder. No OCR, background-removal model, spreadsheet framework, editor framework, analytics SDK or conversion API is included.

Heavy libraries are dynamically imported by their dedicated tools. Versions are resolved in package-lock.json and security-checked with npm audit.
