# Verification report

Verified on 16 September 2026 against the production static export, using Chromium 153 in a Linux test environment.

## Results

| Check | Result |
| --- | --- |
| ESLint | Passed |
| Strict TypeScript | Passed |
| Vitest | 18 tests passed |
| Playwright | 15 integration tests passed |
| Production build | Passed; static export generated |
| Production dependency audit | No known vulnerabilities reported by npm audit --omit=dev at verification time |
| Sitemap | 45 indexable routes: 39 tools plus home, directory and four trust pages |
| Internal links | 46 checked, none broken |
| Browser page errors in route audit | None |
| External requests in homepage audit | None |
| Network mutations in homepage audit | None |
| Heavy engine requests on homepage | None |

## Functional output checks

- Decoded image resize/compression downloads and verified 100 × 50 pixel output from a 200 × 100 source.
- Produced actual MP4 files and extracted MP3. Independent ffprobe inspection confirmed H.264/AAC and 160 × 90 resized video, and an MP3 audio stream.
- Exported WebM with VP8/Opus, WAV and OGG; verified their file signatures. VP9 caused a Chromium crash in this environment and was replaced by the tested VP8 path.
- Confirmed cancellation stops conversion without exposing a completed download.
- Parsed downloaded PDFs to validate page counts after merging, splitting, duplication, annotation and compression.
- Opened DOCX ZIP structures and checked document.xml for extracted PDF text and resume content.
- Confirmed resume local autosave survives reload.
- Verified screenshot cropping changes dimensions, and image-to-PDF produces a valid PDF.
- Checked CSV/JSON document conversion, QR PNG and ZIP generation, text utilities, cryptographic password output, calculators and unit conversion results.
- Confirmed invalid image/PDF inputs show errors without fake downloads.
- Image processing tests observed no POST/PUT/PATCH file-upload requests.

## Responsive and accessibility checks

All 39 tool pages were checked for horizontal overflow at 320, 360, 375, 390, 414, 768, 1024, 1280, 1440 and 1920 pixels. The homepage was checked at the same widths. Desktop and phone screenshots were visually inspected.

Axe found no critical or serious violations on the homepage and representative image, video, PDF, age, resume and unit workspaces, including populated image/PDF states. This is automated coverage, not a full manual accessibility certification. Freehand canvas editing still depends on pointer/touch input.

## SEO checks

All tool routes have unique titles/descriptions, the expected H1, canonical URLs, valid parseable JSON-LD and links from the directory. Sitemap and robots routes return successfully. The default canonical origin is configurable and must be changed to the actual deployment origin before publishing.

## Local performance sample

| Homepage measurement | Observed |
| --- | --- |
| First Contentful Paint | 324 ms |
| Largest Contentful Paint | 324 ms |
| Cumulative Layout Shift | 0 |
| Initial JavaScript, uncompressed | 488,400 bytes |
| Initial JavaScript, gzip estimate | 147,394 bytes |
| On-demand FFmpeg WASM | 32,232,419 bytes |
| On-demand PDF worker | 1,265,413 bytes |

These are one local, unthrottled lab sample. They do not establish real-user Core Web Vitals, mobile network performance, INP or production hosting performance. No public deployment was performed as part of this verification.

## Remaining platform limits

Safari, Firefox and physical mobile-device behavior have not been verified. Large-file success depends on device memory. PDF annotation/compression flattening, Latin-only direct PDF text export, no OCR and other supported-format limits are documented in the README and tool pages. See README.md for deployment and THIRD_PARTY.md for dependency licensing.
