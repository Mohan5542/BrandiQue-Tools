"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
const loading = () => <p role="status">Opening your workspace…</p>;
const ImageTool = dynamic(() => import("./tools/image"), { loading });
const VideoTool = dynamic(() => import("./tools/video"), { loading });
const PdfTool = dynamic(() => import("./tools/pdf"), { loading });
const DocumentTool = dynamic(() => import("./tools/document"), { loading });
const ResumeTool = dynamic(() => import("./tools/resume"), { loading });
const Screenshot = dynamic(() => import("./tools/screenshot"), { loading });
const Utility = dynamic(() => import("./tools/utility"), { loading });
const Hub = dynamic(() => import("./tools/hub"), { loading });
const ImagePdf = dynamic(() => import("./tools/image-pdf"), { loading });
const UnitTool = dynamic(
  () => import("./tools/calculators").then((m) => m.UnitTool),
  { loading },
);
const CalculatorTool = dynamic(
  () => import("./tools/calculators").then((m) => m.CalculatorTool),
  { loading },
);
const AgeTool = dynamic(
  () => import("./tools/calculators").then((m) => m.AgeTool),
  { loading },
);
function ToolContent({ engine, slug }: { engine: string; slug: string }) {
  switch (engine) {
    case "image":
      return <ImageTool slug={slug} />;
    case "video":
      return <VideoTool slug={slug} />;
    case "pdf":
      return <PdfTool slug={slug} />;
    case "document":
      return <DocumentTool slug={slug} />;
    case "resume":
      return <ResumeTool />;
    case "screenshot":
      return <Screenshot />;
    case "units":
      return <UnitTool slug={slug} />;
    case "calculator":
      return <CalculatorTool slug={slug} />;
    case "age":
      return <AgeTool />;
    case "utility":
      return <Utility slug={slug} />;
    case "hub":
      return <Hub />;
    case "imagepdf":
      return <ImagePdf />;
    default:
      return <p>This tool is unavailable.</p>;
  }
}

export default function ToolApp(props: { engine: string; slug: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div data-tool-ready={ready}>
      <ToolContent {...props} />
    </div>
  );
}
