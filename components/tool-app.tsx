"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
function Loading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="workspace-loading" role="status" aria-live="polite">
      <p>Opening your workspace…</p>
      {slow && (
        <>
          <p>
            Loading is taking longer than usual. Check your connection and
            reload to retry.
          </p>
          <button onClick={() => window.location.reload()}>Reload tool</button>
        </>
      )}
    </div>
  );
}
const ImageTool = dynamic(() => import("./tools/image"), { loading: Loading });
const VideoTool = dynamic(() => import("./tools/video"), { loading: Loading });
const PdfTool = dynamic(() => import("./tools/pdf"), { loading: Loading });
const DocumentTool = dynamic(() => import("./tools/document"), {
  loading: Loading,
});
const ResumeTool = dynamic(() => import("./tools/resume"), {
  loading: Loading,
});
const Screenshot = dynamic(() => import("./tools/screenshot"), {
  loading: Loading,
});
const Utility = dynamic(() => import("./tools/utility"), { loading: Loading });
const Hub = dynamic(() => import("./tools/hub"), { loading: Loading });
const ImagePdf = dynamic(() => import("./tools/image-pdf"), {
  loading: Loading,
});
const UnitTool = dynamic(
  () => import("./tools/calculators").then((m) => m.UnitTool),
  { loading: Loading },
);
const CalculatorTool = dynamic(
  () => import("./tools/calculators").then((m) => m.CalculatorTool),
  { loading: Loading },
);
const AgeTool = dynamic(
  () => import("./tools/calculators").then((m) => m.AgeTool),
  { loading: Loading },
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
      {ready ? <ToolContent key={props.slug} {...props} /> : <Loading />}
    </div>
  );
}
