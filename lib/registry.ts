export type Category =
  | "Images"
  | "Video & Audio"
  | "PDF & Documents"
  | "Converters"
  | "Calculators"
  | "Writing & Resume"
  | "Developer & Utilities";
export type Tool = {
  slug: string;
  name: string;
  category: Category;
  description: string;
  formats: string;
  limitation: string;
  steps: string[];
  popular?: boolean;
  engine: string;
};
const make = (
  slug: string,
  name: string,
  category: Category,
  description: string,
  formats: string,
  limitation: string,
  engine: string,
  popular = false,
): Tool => ({
  slug,
  name,
  category,
  description,
  formats,
  limitation,
  engine,
  popular,
  steps: [],
});
export const tools: Tool[] = [
  make(
    "image-resizer",
    "Image Resizer",
    "Images",
    "Resize photos to exact dimensions or a percentage. Process a batch and download individual images or a ZIP.",
    "JPG, PNG, WebP input and output; browser-decodable AVIF input",
    "Animated images export as a single frame. JPEG output replaces transparency with white.",
    "image",
    true,
  ),
  make(
    "image-compressor",
    "Image Compressor",
    "Images",
    "Reduce image file size with adjustable quality, dimensions, and an optional target size. Compare actual results before downloading.",
    "JPG, PNG, WebP output; JPG, PNG, WebP, AVIF input",
    "PNG is lossless: the quality slider does not reduce PNG quality. Target sizes are best-effort for JPEG and WebP.",
    "image",
    true,
  ),
  make(
    "video-resizer",
    "Video Resizer",
    "Video & Audio",
    "Change video resolution with contain, cover, or stretch fitting, using FFmpeg locally on your device.",
    "MP4 and WebM output; common FFmpeg-decodable video inputs",
    "The video engine downloads on demand (about 32 MB). Large videos can exceed browser memory. Mobile processing can be slow.",
    "video",
    true,
  ),
  make(
    "video-compressor",
    "Video Compressor",
    "Video & Audio",
    "Compress a video with quality, bitrate, resolution, frame rate and audio controls. See the real size difference.",
    "MP4 (H.264/AAC), WebM (VP8/Opus)",
    "Compression may produce a larger file for already optimized videos. Bitrate estimates exclude container overhead.",
    "video",
  ),
  make(
    "video-to-audio",
    "Video to Audio",
    "Video & Audio",
    "Extract an audio track from a video without uploading the recording. Export an MP3, WAV or OGG file.",
    "MP3, WAV, OGG output",
    "The source must contain a decodable audio stream. WAV is uncompressed and can be very large.",
    "video",
  ),
  make(
    "age-calculator",
    "Age Calculator",
    "Calculators",
    "Discover your calendar age, next birthday and elapsed time, with optional life estimates based on assumptions you control.",
    "Local date and optional time",
    "Dates use your device timezone. February 29 birthdays are observed on February 28 in non-leap years. Life statistics are estimates, not medical facts.",
    "age",
    true,
  ),
  make(
    "pdf-to-word",
    "PDF to Word",
    "PDF & Documents",
    "Extract text from each PDF page into an editable Word document. Page breaks are preserved for easy cleanup.",
    "Text-based PDF → DOCX",
    "Complex layouts, scanned documents, tables, fonts and graphics may not convert perfectly in browser-only processing. No OCR is included.",
    "document",
    true,
  ),
  make(
    "document-converter",
    "Document Converter",
    "PDF & Documents",
    "Convert plain text, Markdown source, HTML text content, JSON and CSV through explicitly supported paths.",
    "TXT / MD / HTML → TXT, DOCX, PDF; JSON ↔ CSV; TXT ↔ MD",
    "HTML is extracted as text, never executed. Document layout, embedded media and Markdown formatting are not preserved. CSV conversion expects a header row and flat records.",
    "document",
  ),
  make(
    "file-converter",
    "Universal File Converter",
    "Converters",
    "Find the right local conversion engine using a documented matrix of supported formats.",
    "Images, documents, video, audio and ZIP packaging",
    "This hub routes supported conversions to dedicated tools. Arbitrary file-to-file conversions are not supported. ZIP packaging is not format conversion.",
    "hub",
  ),
  make(
    "pdf-editor",
    "PDF Editor",
    "PDF & Documents",
    "Organize PDF pages and add text, drawings, shapes, images and highlights before exporting a new PDF.",
    "Unencrypted PDF input and PDF output",
    "Annotations are flattened overlays. Existing text is not directly editable. Covering text is not secure redaction. Standard text uses Latin fonts.",
    "pdf",
    true,
  ),
  make(
    "pdf-merger",
    "PDF Merger",
    "PDF & Documents",
    "Combine PDFs in your chosen order, with page previews and a downloadable merged document.",
    "Unencrypted PDF files",
    "Interactive forms and signatures may not retain their original behavior. Digitally signed documents lose signature validity after editing.",
    "pdf",
  ),
  make(
    "pdf-splitter",
    "PDF Splitter",
    "PDF & Documents",
    "Select pages to export or download every page as its own PDF inside a ZIP archive.",
    "Unencrypted PDF files",
    "Split files contain the selected pages. Document-level bookmarks and metadata may not be retained.",
    "pdf",
  ),
  make(
    "pdf-compressor",
    "PDF Compressor",
    "PDF & Documents",
    "Create a smaller image-based PDF by rasterizing pages at adjustable resolution and JPEG quality.",
    "PDF → rasterized PDF",
    "This is a lossy conversion: text becomes images, and search, links, forms and accessibility information are lost. Not recommended for resumes.",
    "pdf",
  ),
  make(
    "image-to-pdf",
    "Image to PDF",
    "PDF & Documents",
    "Arrange images and create a PDF with one image on each page. Choose page size and margins.",
    "JPG, PNG, WebP → PDF",
    "Images are raster content. This does not recognize text or make an accessible tagged PDF.",
    "imagepdf",
  ),
  ...(
    [
      "unit",
      "area",
      "length",
      "temperature",
      "volume",
      "weight",
      "power",
      "speed",
    ] as const
  ).map((k) =>
    make(
      k + "-converter",
      k[0].toUpperCase() + k.slice(1) + " Converter",
      "Converters",
      k === "unit"
        ? "Convert length, area, temperature, volume, mass, power and speed with clearly labeled units."
        : `Convert ${k} measurements instantly, with swap controls and a visible conversion formula.`,
      "Numeric measurements, including decimals and scientific notation",
      "Volume units labeled US use US customary definitions. Horsepower means mechanical horsepower. Rounding is for display only.",
      "units",
      k === "unit",
    ),
  ),
  make(
    "ats-resume-builder",
    "ATS Resume Builder",
    "Writing & Resume",
    "Build a clear single-column resume with a live preview, local autosave and selectable-text PDF and DOCX exports.",
    "PDF, DOCX and resume JSON",
    "No template guarantees ATS acceptance. Check the exported pages for overflow and tailor content to each job. Local autosave is visible to others using this browser profile.",
    "resume",
    true,
  ),
  make(
    "screenshot-editor",
    "Screenshot Editor",
    "Images",
    "Crop, annotate, blur or pixelate screenshots. Add arrows, drawings, padding and a background, then export without a watermark.",
    "PNG, JPG, WebP output",
    "Edits are rasterized. Blur and pixelation can retain clues; use an opaque rectangle and inspect the export for sensitive content.",
    "screenshot",
  ),
  make(
    "qr-code-generator",
    "QR Code Generator",
    "Developer & Utilities",
    "Turn text or a URL into a downloadable QR code, generated locally in your browser.",
    "Text / URL → PNG",
    "QR codes have finite capacity. Test the exported image with your intended scanner before printing.",
    "utility",
  ),
  ...[
    [
      "json-formatter",
      "JSON Formatter",
      "Format JSON with readable indentation or minify it for compact storage.",
    ],
    [
      "json-validator",
      "JSON Validator",
      "Validate JSON syntax and find parsing errors before using your data.",
    ],
    [
      "base64-encoder-decoder",
      "Base64 Encode / Decode",
      "Encode Unicode text to Base64 or decode Base64 back into UTF-8 text.",
    ],
    [
      "url-encoder-decoder",
      "URL Encode / Decode",
      "Escape a URL component or decode percent-encoded text.",
    ],
    [
      "password-generator",
      "Password Generator",
      "Generate a random password using your browser’s cryptographic random number generator.",
    ],
    [
      "word-counter",
      "Word & Character Counter",
      "Count words, characters, sentences and lines as you type.",
    ],
    [
      "case-converter",
      "Case Converter",
      "Switch text between uppercase, lowercase, title case and sentence case.",
    ],
    [
      "text-cleaner",
      "Text Cleaner",
      "Trim lines, collapse extra spaces and remove blank lines from pasted text.",
    ],
    [
      "color-converter",
      "Color Converter",
      "Convert HEX, RGB and HSL color notation into matching values for design and development.",
    ],
    [
      "timestamp-converter",
      "Timestamp Converter",
      "Translate Unix timestamps in seconds or milliseconds into UTC and local dates.",
    ],
  ].map(([s, n, d]) =>
    make(
      s,
      n,
      "Developer & Utilities",
      d,
      "Text input",
      "Results stay in this tab. Base64 is encoding, not encryption. Unix timestamps represent instants, while displayed local times depend on the device timezone.",
      "utility",
    ),
  ),
  ...[
    [
      "percentage-calculator",
      "Percentage Calculator",
      "Calculate a percentage of a number and the increase or decrease between two values.",
    ],
    [
      "emi-calculator",
      "EMI Calculator",
      "Estimate monthly repayments and total interest for a fixed-rate loan using a reducing-balance formula.",
    ],
    [
      "discount-calculator",
      "Discount Calculator",
      "Calculate the sale price and money saved after a percentage discount.",
    ],
    [
      "gst-calculator",
      "GST Calculator",
      "Add or remove a user-specified GST rate and see the base amount and tax separately.",
    ],
  ].map(([s, n, d]) =>
    make(
      s,
      n,
      "Calculators",
      d,
      "Numeric amounts and user-entered percentages",
      "Calculations are estimates, not financial or tax advice. Loan fees and rate changes are not included. Enter the rate applicable to your situation.",
      "calculator",
    ),
  ),
];
for (const t of tools) {
  t.steps =
    t.engine === "units" || t.engine === "calculator" || t.engine === "age"
      ? [
          "Enter the values you want to calculate.",
          "Adjust the units, date or assumptions to match your situation.",
          "Read the result and check the explanation and limitations below.",
        ]
      : t.engine === "hub"
        ? [
            "Choose a source format in the supported conversion matrix.",
            "Open the linked tool for your desired output.",
            "Process locally and download only after a successful conversion.",
          ]
        : t.engine === "utility"
          ? [
              "Enter or paste your input into the labeled field.",
              "Choose an operation and review the result.",
              "Copy or download the result when you are satisfied.",
            ]
          : [
              "Choose your local file or enter your content.",
              "Adjust the settings and review the preview.",
              "Process your file, inspect the result and download it to your device.",
            ];
}
const specificSteps: Record<string, string[]> = {
  "image-resizer": [
    "Choose one or more JPG, PNG, WebP or AVIF images.",
    "Set a width or percentage. Keep aspect ratio locked to avoid distortion, or unlock it to use contain or cover.",
    "Choose JPG, PNG or WebP, resize, compare actual dimensions and download each image or a ZIP.",
  ],
  "image-compressor": [
    "Choose your images and select a lossy output such as WebP or JPG for quality-based compression.",
    "Adjust quality and dimensions; optionally enter a target size in KB. PNG uses lossless encoding.",
    "Compress, compare actual sizes and download only the results that meet your needs.",
  ],
  "video-resizer": [
    "Choose a video and inspect its dimensions and duration.",
    "Set output dimensions, fit, MP4 or WebM format, quality and audio options.",
    "Press Convert video to load the local engine. Keep this tab open, then preview and download the completed output.",
  ],
  "video-compressor": [
    "Choose a short source video to check your device’s processing capacity.",
    "Choose a smaller-file preset or set CRF, bitrate, dimensions and frame rate yourself.",
    "Convert locally and compare the actual output size. Cancel stops the engine without creating a download.",
  ],
  "video-to-audio": [
    "Choose a video containing an audio track, or a supported audio file.",
    "Select MP3, WAV or OGG and an audio bitrate. WAV is uncompressed.",
    "Extract audio, listen to the output and download it after processing completes.",
  ],
  "pdf-to-word": [
    "Choose a PDF containing selectable text. Scanned-only documents require OCR that this tool does not provide.",
    "Convert document to extract each page’s text into DOCX.",
    "Download the Word document and review spacing, reading order and page breaks.",
  ],
  "pdf-editor": [
    "Choose one or more unencrypted PDFs and select a page.",
    "Reorder, rotate or duplicate pages. Click to place text or drag to add an annotation.",
    "Export the PDF. Annotated pages become images; inspect the result and keep the original.",
  ],
  "pdf-merger": [
    "Choose the PDFs you want to combine; pages are appended in selection order.",
    "Use page buttons and Move left / right to arrange the final sequence.",
    "Export the combined PDF and check its page order.",
  ],
  "pdf-splitter": [
    "Choose an unencrypted PDF and select a page.",
    "Export just the selected page, or remove unwanted pages before exporting a selection.",
    "Use Split all pages to ZIP for individual PDFs, or Export PDF for the remaining pages together.",
  ],
  "pdf-compressor": [
    "Choose a PDF and keep an original copy. This tool rasterizes pages and removes searchable text.",
    "Select a lower DPI and JPEG quality appropriate for the intended use.",
    "Export and compare the actual quality and file size; already optimized files may become larger.",
  ],
  "image-to-pdf": [
    "Choose JPG, PNG or WebP images.",
    "Reorder images and choose A4, Letter or image-sized pages with a margin.",
    "Create PDF and download one image per page.",
  ],
  "age-calculator": [
    "Enter your date of birth and, optionally, your birth time.",
    "Read your calendar age, elapsed-time totals and next-birthday countdown in your device timezone.",
    "Change the assumptions for estimated heartbeats, breathing, sleep and steps. These estimates are not personal measurements.",
  ],
  "ats-resume-builder": [
    "Add your name, contact details and content under standard resume headings.",
    "Add, remove or reorder sections and review the single-column preview.",
    "Export PDF or DOCX, or use Print for the selected preview template. Save a JSON backup to move the draft between devices.",
  ],
  "screenshot-editor": [
    "Choose a screenshot or paste one from your clipboard.",
    "Select a tool and click for text or drag for a crop, annotation, blur or pixelation. Use Undo to reverse an edit.",
    "Choose padding, background, corners and output format, then export and download.",
  ],
  "document-converter": [
    "Choose a TXT, Markdown, HTML, CSV or JSON file.",
    "Select one of the output formats actually available for that source.",
    "Convert and inspect the text preview before downloading. Rich layouts and nested CSV structures are not supported.",
  ],
};
for (const t of tools)
  if (specificSteps[t.slug]) t.steps = specificSteps[t.slug];
export const categories = [...new Set(tools.map((t) => t.category))];
export function related(t: Tool) {
  const explicit: Record<string, string[]> = {
    "image-resizer": [
      "image-compressor",
      "image-to-pdf",
      "screenshot-editor",
      "file-converter",
    ],
    "age-calculator": [
      "timestamp-converter",
      "percentage-calculator",
      "unit-converter",
    ],
    "pdf-to-word": [
      "pdf-editor",
      "pdf-merger",
      "pdf-splitter",
      "document-converter",
    ],
  };
  return (
    explicit[t.slug]
      ? explicit[t.slug].map((s) => tools.find((x) => x.slug === s)!)
      : tools.filter((x) => x.slug !== t.slug && x.category === t.category)
  ).slice(0, 4);
}
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://brandique-tools.vercel.app"
).replace(/\/$/, "");
