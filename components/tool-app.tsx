import ImageTool from "./tools/image";
import VideoTool from "./tools/video";
import PdfTool from "./tools/pdf";
import DocumentTool from "./tools/document";
import ResumeTool from "./tools/resume";
import Screenshot from "./tools/screenshot";
import Utility from "./tools/utility";
import Hub from "./tools/hub";
import ImagePdf from "./tools/image-pdf";
import { UnitTool, CalculatorTool, AgeTool } from "./tools/calculators";
import { ToolWorkspace } from "./tool-workspace";
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

// Server selection gives Next only the selected client component reference.
// UI code is part of the route, not a second runtime import waterfall.
export default function ToolApp(props: { engine: string; slug: string }) {
  return (
    <ToolWorkspace key={props.slug} slug={props.slug}>
      <ToolContent {...props} />
    </ToolWorkspace>
  );
}
