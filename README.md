# BrandiQue Tools

**Powerful Free Tools. Right in Your Browser.**

A free, privacy-focused toolkit by [BrandiQue Web Solutions](https://www.brandique.in). Dedicated mini-apps for images, video, PDFs, documents, resumes, calculations and everyday utilities. No login, processing database, remote conversion API or server-side file storage.

## Features

- 39 dedicated tool routes with shared navigation, instant search, categories and related tools.
- Premium black/yellow responsive interface, keyboard-friendly controls, visible focus, labeled inputs and accessible status/error messages.
- Real local processing, actual previews and downloadable outputs. Unsupported paths are explicitly documented.
- Static, crawlable HTML with per-tool metadata, canonical links, Open Graph/X text, JSON-LD, sitemap and robots.
- No analytics, advertising scripts, third-party fonts or external conversion services enabled by default.
- Resume autosave in the current browser profile, with JSON backup/import.
- Reserved ad slots, About, Privacy, Terms and Contact pages.

## Stack and architecture

Next.js 16 App Router, React 19, strict TypeScript, a CSS token/component system, Lucide icons, ESLint, Vitest, Playwright and axe-core. Exact resolved versions are in `package-lock.json`.

```
app/                        Static pages, metadata, sitemap and robots
app/tools/[slug]/           Reusable dedicated tool page
components/shell.tsx         Navigation, search, directory and cards
components/ui.tsx            Uploads, fields, errors, status, previews, downloads, ads
components/tools/            Dedicated tool implementations
components/tool-app.tsx      Code-split engine dispatcher
lib/registry.ts              Tool descriptions, categories, formats, limits, related links
lib/calculations.ts          Testable age, unit, EMI, CSV and image geometry logic
lib/documents.ts             Lazy PDF/DOCX helpers
lib/video.ts                 Testable FFmpeg command generation
public/workers/image.js      OffscreenCanvas processing worker
scripts/vendor.mjs          Copy self-hosted processing assets at build time
scripts/serve.mjs            Static preview with security headers
```

Pages use `generateStaticParams` and `output: 'export'`. There are no API routes, server actions, runtime database bindings or file upload endpoints. Each tool receives a distinct URL and meaningful server-rendered content. Large engines are dynamically imported by the tool that needs them, never loaded on the homepage.

## Tool list

| Category | Dedicated tools |
| --- | --- |
| Images | Image Resizer, Image Compressor, Screenshot Editor |
| Video & Audio | Video Resizer, Video Compressor, Video to Audio |
| PDF & Documents | PDF to Word, Document Converter, PDF Editor, PDF Merger, PDF Splitter, PDF Compressor, Image to PDF |
| Converters | Universal File Converter, Unit Converter, Area Converter, Length Converter, Temperature Converter, Volume Converter, Weight Converter, Power Converter, Speed Converter |
| Calculators | Age Calculator, Percentage Calculator, EMI Calculator, Discount Calculator, GST Calculator |
| Writing & Resume | ATS Resume Builder |
| Developer & Utilities | QR Code Generator, JSON Formatter, JSON Validator, Base64 Encode/Decode, URL Encode/Decode, Password Generator, Word & Character Counter, Case Converter, Text Cleaner, Color Converter, Timestamp Converter |

All tools live under `/tools/<slug>/`. `/tools/` is the searchable directory. The registry is the canonical route inventory; only real implemented tools enter the sitemap.

## Supported conversions

| Input | Output | Details |
| --- | --- | --- |
| JPG, PNG, WebP, browser-decodable AVIF | JPG, PNG, WebP | Canvas; dimensions, fit, batch ZIP, quality and best-effort target size. PNG quality is lossless, not JPEG-style. |
| Common FFmpeg-decodable video containers | MP4 H.264/AAC, WebM VP8/Opus | Resolution, fit, CRF or bitrate, FPS, audio and cancel. Codec support is validated by the actual engine. |
| Video with a decodable audio stream, supported audio | MP3, WAV, OGG | Local FFmpeg extraction/transcoding. |
| Text-based PDF | DOCX | Extracted text and page breaks. No scanned-document OCR or perfect layout recreation. |
| TXT, Markdown source, HTML text content | TXT/MD where applicable, DOCX, PDF | Plain-text conversion, not a rich-layout renderer. HTML is parsed inertly; scripts/styles are removed. |
| CSV with unique header row | JSON records | Quoted commas, quotes and line breaks supported. Inconsistent row lengths rejected. |
| JSON array of flat records | CSV | Nested objects rejected. |
| JPG, PNG, WebP | PDF | One image per page; A4, Letter or image dimensions. |
| PDF | Edited/merged/split PDF | Page operations retain content; annotated pages are flattened. |
| PDF | Smaller raster PDF | Lossy resolution/JPEG mode; destroys text search, forms, links and accessibility tags. Output is not guaranteed smaller. |
| Text/URL | QR PNG | Actual QR encoding; test with a scanner before printing. |
| Arbitrary files | ZIP archive | Packaging only; does not convert their internal formats. |

Unsupported: arbitrary “any-to-any” conversion, AVIF encoding, SVG export, scanned PDF OCR, direct editing of existing PDF text, background removal and rich DOCX layout conversion. The universal converter is a supported-path hub, not a fictional universal codec.

## Local processing and privacy

User-selected files stay in browser memory. Workers receive local bytes, not network upload requests. Downloads use Blob/object URLs; previews revoke URLs on replacement/unmount, and workers/temporary media files are released after processing. The image worker uses OffscreenCanvas; video runs in the FFmpeg worker. PDF.js parses in its worker, while document generation and some canvas operations run on the main thread.

The browser downloads website and engine assets from the same origin. Ordinary hosting request logs may contain IP/user-agent information. This is **not** a zero-network-traffic promise. Resume drafts use local storage and can be removed via Reset or clearing site data. They are not encrypted by this app and are visible to others using the same browser profile. No file contents, entered DOB, resume content or document text are sent to analytics.

No analytics SDK is installed. If aggregate tracking is later added, use an explicit allowlist of tool slug and event type only. Never include filenames, input values, file bytes, resume content or previews. Update disclosure/consent and security policy before adding advertising or analytics.

## Development

Use Node.js 24 and npm. Install the locked dependencies:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin before building. The default `https://tools.brandique.in` is a configurable intended origin, **not a claim that this domain has been deployed or connected**.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm run build` copies engine assets and exports the site into `out/`. `npm start` serves that static export on port 3000, with the headers from `public/_headers`. Set `PORT` to override it. The application needs no Node server in production; the included server is a preview convenience.

### Browser tests

```sh
npx playwright install --with-deps chromium
npm run build
npm run test:e2e
```

For a preinstalled Chromium, set `CHROMIUM_EXECUTABLE=/absolute/path/to/chromium`. The optional `@sparticuz/chromium` development dependency supports constrained CI environments; it is never shipped to site visitors. Fixtures contain generated, non-sensitive content. To regenerate them, install FFmpeg and run `node scripts/fixtures.mjs`.

Unit tests cover age/leap dates, unit factors, temperature bounds, EMI, CSV round-trips, image geometry, actual video commands and registry integrity. Browser tests inspect rendered routes, metadata, layouts, accessibility, output signatures, decoded image dimensions, PDF page counts, DOCX XML, local autosave and network upload behavior. CI runs lint, unit tests, build, types and browser tests.

## Deployment

1. Connect this repository to a static hosting provider that accepts individual files larger than 32 MB (the FFmpeg WASM file is approximately 31 MiB).
2. Use build command `npm ci && npm run build`, output directory `out`, and Node.js 24.
3. Set `NEXT_PUBLIC_SITE_URL` to the actual public origin and rebuild.
4. Serve `.wasm` as `application/wasm` and `.mjs` as JavaScript. Preserve nested `index.html` routes and all `_next` assets, including static routing text files.
5. Apply `public/_headers` or translate it into the host's equivalent header configuration. HTTPS is required for secure browser features. The single-thread FFmpeg build does not require cross-origin isolation.
6. Verify video loading, downloads, canonical URLs, `/sitemap.xml`, `/robots.txt` and your hosting cache/compression settings on the deployed origin.

The project uses root-relative paths and is intended for a domain/subdomain root, not a GitHub Pages repository subdirectory without further base-path configuration. No deployment, DNS change or ad account approval is implied by the source being pushed to GitHub.

## SEO and ads

The central registry drives unique tool titles, descriptions, H1s, supported-format content, FAQs and related links. Pages emit WebApplication, BreadcrumbList and accurate FAQPage JSON-LD; the home page includes WebSite/Organization information. No invented reviews, ratings or search-ranking promises.

Each tool reserves one non-overlapping, stable-height ad space after its workspace. `AdSlot` has a position identifier for later integration. There are no fake ads, intrusive mobile overlays, publisher IDs or enabled third-party scripts. Connect approved advertising only after updating the privacy policy, applicable consent handling and CSP. AdSense approval is not guaranteed.

## Browser and feature limitations

- Current Chromium-based browsers are the main tested target. Safari/Firefox need additional platform verification; codec, Canvas and large-file behavior varies.
- Video input safety budget: 512 MB; working memory can be several times input size. A phone may fail on much smaller videos. Keep the tab open. Progress is FFmpeg-reported and approximate, never a simulated timer.
- Images: input guard at 60 megapixels; output guard at 40 megapixels and 16,384 pixels per side. JPEG uses white behind transparency. Animations are not preserved. Exact file sizes cannot be guaranteed.
- PDF input guard: 100 MB. Password-protected files are rejected. Annotations are flattened at export, and are **not secure redaction**. Crop changes the visible page box rather than removing underlying data. Page rotation clears existing overlays to avoid misplaced marks.
- PDF compression rasterizes all pages. Never use it for an ATS resume or a document requiring selectable text or accessibility tags.
- PDF text exports use a standard Latin font. Use DOCX for writing systems it cannot encode. The resume preview has three templates; direct exports use a clean single-column layout, while Print follows the selected preview.
- DOCX, ZIP generation and some image/PDF operations can occupy the main thread. Large batches are device-dependent.
- Screenshot drawing and PDF annotations use pointer/touch canvases. General controls and downloads are keyboard accessible; fully equivalent nonvisual freehand editing is not provided.
- Age uses the device timezone and calendar arithmetic; February 29 is observed on February 28 in common years. Total elapsed time is timestamp-based. Life statistics are assumptions, not individual medical facts.
- Financial calculations are illustrative. Rates are entered by the user; no live tax or lending-rate claims are made.

See `THIRD_PARTY.md` for dependency choices and FFmpeg's separate GPL obligations. Keep original files and verify exported results before relying on them.

## Reliability and loading improvements

- File selection uses a native keyboard-operable button and reports local read progress. Missing/generic MIME metadata from device pickers is normalized by extension; actual decoders still validate file contents. Invalid images in a batch no longer discard valid images.
- Image processing falls back to Canvas when a Worker/OffscreenCanvas path is unavailable. Both paths support target-size attempts; unsupported encoders fail explicitly. The compressor preserves each image's dimensions by default. Original previews decode lazily.
- PDF editing loads `pdf-lib` only after selection/export, retains parsed PDF preview documents within the workspace, and repaints annotations without reopening the PDF worker. Preview jobs are cancelled when changing pages; resources are released on reset/navigation.
- Video conversions reuse the initialized FFmpeg worker within the current tool. Reset, cancel, or leaving the tool releases it. The first conversion still downloads the approximately 32 MB engine; video processing time depends on duration, resolution, codec and device performance.
- Interactive tool controls mount only after browser initialization, avoiding duplicate server/client controls and lost early file selections. Tool descriptions, metadata, instructions and FAQs remain server-rendered. Tool cards prefetch on hover/keyboard focus; navigation provides loading feedback and slow-load recovery. Screenshot undo history has a memory budget, and clipboard denial shows an actionable message.
- The included `npm start` server streams files, negotiates gzip, supports ETags, revalidates HTML, and caches versioned assets. A third-party static host must enable equivalent compression/cache settings itself; `_headers` support varies by provider.

To reproduce the cold-load check, build first, then run `node scripts/loading-audit.mjs`. Set `CHROMIUM_EXECUTABLE` if using a nonstandard Chromium location. The script simulates 1.6 Mbps download, 100 ms latency and 4× CPU slowdown in Chromium; it is a local lab check, not a guarantee for every device or hosting provider.
