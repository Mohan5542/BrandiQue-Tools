export async function textDocx(text: string, title?: string) {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const doc = new Document({
    sections: [
      {
        children: [
          ...(title ? [new Paragraph({ text: title, heading: "Title" })] : []),
          ...text
            .split("\n")
            .map((line) => new Paragraph({ children: [new TextRun(line)] })),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
export async function textPdf(text: string, title?: string) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([595.28, 841.89]),
    y = 790;
  const safe = (s: string) => {
    try {
      font.encodeText(s);
      return s;
    } catch {
      throw new Error(
        "PDF export currently supports Latin text only. Use DOCX for other writing systems.",
      );
    }
  };
  const draw = (line: string, size = 11) => {
    if (y < 50) {
      page = doc.addPage([595.28, 841.89]);
      y = 790;
    }
    page.drawText(safe(line), { x: 50, y, font, size, color: rgb(0, 0, 0) });
    y -= size * 1.5;
  };
  if (title) {
    draw(title, 20);
    y -= 10;
  }
  for (const line of text.split("\n")) {
    let current = "";
    for (const char of line) {
      if (font.widthOfTextAtSize(safe(current + char), 11) > 495) {
        draw(current);
        current = char;
      } else current += char;
    }
    draw(current);
  }
  return new Blob([new Uint8Array(await doc.save())], {
    type: "application/pdf",
  });
}
export async function loadPdf(data: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    cMapUrl: "/vendor/pdf-cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/vendor/pdf-standard_fonts/",
    wasmUrl: "/vendor/pdf-wasm/",
    iccUrl: "/vendor/pdf-iccs/",
  });
  const doc = await task.promise;
  return Object.assign(doc, { destroy: () => task.destroy() });
}
