# Verification report

Verified on 16 September 2026 against the production static export, using Chromium 153 in a Linux test environment.

## Results

| Check | Result |
| --- | --- |
| ESLint | Passed |
| Strict TypeScript | Passed |
| Vitest | 20 tests passed |
| Playwright | 22 integration tests passed |
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


## Upload reliability and performance follow-up

The follow-up reproduced two failures before changing the implementation: a corrupt image rejected an entire otherwise valid batch, and two annotations with page switches started five PDF workers. The updated implementation retains valid batch entries, reports the bad filename, and reuses one PDF worker for that interaction. Cold-load reruns also exposed duplicate server/client controls and lost early selections; the interactive workspaces now mount after client initialization, while SEO content stays server-rendered.

New browser regressions cover native picker clicks across image/PDF/video workspaces, keyboard selection, repeated selection, drag/drop with generic MIME metadata, mixed valid/corrupt images, blocked image-worker fallback with a decoded download, repeat video conversions with one worker, and worker release on navigation. Existing conversion, download, all-route/responsive, and accessibility checks still pass. Additional unit tests check MIME fallback without changing file bytes or relabeling unsupported binary formats.

The final checks run against the production static export: build, lint, strict type checking, 20 unit tests and 22 browser tests. The route audit found 45 sitemap routes, 46 internal links checked, no broken links or page errors, and no homepage external requests/network mutations/heavy-engine loads.

### Cold-load comparison

Chromium lab simulation: fresh context for each tool, 1.6 Mbps download, 100 ms latency, 4× CPU slowdown, navigation until an enabled file input. One sample per tool; rounded values below. Before used the original uncompressed local server. After includes deferred PDF imports **and gzip delivery in the bundled server**. A hosted CDN must apply equivalent compression; these are not production speed guarantees.

| Tool | Before | After | Initial JS transferred before → after |
| --- | --- | --- | --- |
| Image Resizer | 3.53 s | 1.72 s | 511,408 → 157,681 bytes |
| PDF Editor | 5.91 s | 1.74 s | 949,097 → 158,302 bytes |
| Video Resizer | 3.44 s | 1.73 s | 509,473 → 156,831 bytes |
| Resume Builder | 3.37 s | 1.70 s | 508,448 → 156,025 bytes |

Repeat video conversions no longer reinitialize the engine. The initial approximately 32 MB FFmpeg download and actual media encoding are separate from workspace-opening measurements. Large files, unsupported codecs, browser memory and platform differences remain real limitations. No live deployment URL was supplied for this follow-up, so production hosting behavior has not been verified.
