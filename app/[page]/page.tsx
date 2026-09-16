import { notFound } from "next/navigation";
import { siteUrl } from "@/lib/registry";
const content: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  about: {
    title: "Tools that respect your time.",
    intro:
      "BrandiQue Tools is a collection of free browser-based tools built by BrandiQue Web Solutions. Each tool has its own focused workspace, with no account required.",
    sections: [
      [
        "Practical by design",
        "Resize images, prepare documents, calculate measurements and create useful outputs without sending your files to a conversion server. We describe supported formats and limitations instead of promising impossible conversions.",
      ],
      [
        "Built by BrandiQue Web Solutions",
        "We help businesses with Website Development, Website Designing, Brand Identity & Logo, SEO & Digital Marketing, E-Commerce Websites, AI Automation and AI Chatbots.",
      ],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro:
      "Your selected files and tool inputs are processed locally in your browser. BrandiQue Tools has no conversion backend, user account system or database for your files.",
    sections: [
      [
        "Local processing",
        "Images, videos, PDFs, resumes and entered text are processed in browser memory. The tool code does not upload this content to a remote conversion service. Downloaded output is saved by your browser. Closing a tab releases its in-memory processing data.",
      ],
      [
        "Local storage",
        "The resume builder stores its current draft in your browser’s local storage so it can be restored on this device. It is not encrypted by this application. Other people using the same browser profile may access it. Use Reset or clear site data to remove it. Other selected files are not persistently stored by the application.",
      ],
      [
        "Network requests",
        "Loading the site downloads HTML, scripts and processing assets. Your hosting provider may receive ordinary request information such as your IP address and user agent. All processing libraries are served from the same website. This is a promise about keeping user files local, not a claim of zero network communication.",
      ],
      [
        "Advertising and analytics",
        "No advertising or analytics scripts are enabled by default. Reserved advertising spaces contain no trackers. If advertising or analytics is introduced, this policy and any required consent controls must be updated before activation. File contents, resume text and document data must never be used for analytics.",
      ],
      [
        "Device limitations",
        "Browser memory, supported codecs and available features differ by device. Use a trusted browser and keep a backup of important source files. Export results should be checked before use.",
      ],
      [
        "Questions",
        "For privacy questions, contact BrandiQue Web Solutions through the website linked below.",
      ],
    ],
  },
  terms: {
    title: "Terms of use",
    intro:
      "BrandiQue Tools provides free browser utilities. By using the tools, you agree to use them responsibly and review their limitations.",
    sections: [
      [
        "Your files and responsibility",
        "You retain ownership of your content. Process only files you have permission to use. Keep an original copy and review exported files for accuracy, quality and suitability before relying on them.",
      ],
      [
        "Availability and limitations",
        "Tools are provided as available. Browser-only processing has format, memory and compatibility limits. We do not promise perfect document conversion, guaranteed compression, uninterrupted availability, search rankings or ATS acceptance.",
      ],
      [
        "Calculations and estimates",
        "Calculators provide informational results from your inputs. Life statistics use assumptions. Financial calculations exclude unentered fees, rate changes and other circumstances. They are not individual medical, tax or financial advice.",
      ],
      [
        "Safe use",
        "Do not use this site to distribute malicious content, interfere with its operation or violate others’ rights. Do not treat an annotation over sensitive PDF text as secure redaction.",
      ],
      [
        "Changes and contact",
        "Features and these terms may change as the project develops. Applicable consumer rights are not excluded by these terms. Contact BrandiQue Web Solutions with questions.",
      ],
    ],
  },
  contact: {
    title: "Let’s make something useful.",
    intro:
      "Have feedback, a tool issue or a business project in mind? Contact BrandiQue Web Solutions through our main website.",
    sections: [
      [
        "Report a tool issue",
        "Include the tool name, browser, device and a description of what went wrong. Do not send private documents or sensitive file contents. A non-sensitive sample can help reproduce a problem if you choose to share one.",
      ],
      [
        "Custom websites and automation",
        "Explore website development, e-commerce, brand identity, SEO, AI automation and AI chatbots with BrandiQue Web Solutions.",
      ],
    ],
  },
};
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(content).map((page) => ({ page }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const c = content[page];
  return c
    ? {
        title: page[0].toUpperCase() + page.slice(1),
        description: c.intro,
        alternates: { canonical: siteUrl + "/" + page + "/" },
      }
    : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const c = content[page];
  if (!c) notFound();
  return (
    <article className="container document">
      <p className="eyebrow">BRANDIQUE TOOLS / {page.toUpperCase()}</p>
      <h1>{c.title}</h1>
      <p className="lead">{c.intro}</p>
      {c.sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      <a
        className="button"
        href="https://www.brandique.in"
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit BrandiQue Web Solutions ↗
      </a>
    </article>
  );
}
